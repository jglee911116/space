'use client';

import { useLanguage } from '@/i18n/language';
import { Line, OrbitControls, Stars } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { Color, DoubleSide, Points, Vector3, MathUtils, Mesh, type Group, type PointsMaterial, type MeshBasicMaterial, type ShaderMaterial } from 'three';
import { KM_PER_AU } from '@/constants/space/units';
import { kmPerPixel, type ReportDistanceScale } from '../utils/distance-scale';
import type { Body, StarSystem } from '@/constants/space';
import { createMotions, isSatellite, rotationPhase, setWorldPosition, stellarTextureShear, UNITS_PER_AU } from '../utils/orbit';
import { OortCloudModel } from '../three/oort-cloud';
import { PlanetMaterial, PlanetRings } from '../three/planet-surface';
import { surfaceFragment, surfaceVertex } from '../three/shaders';
import { StellarGlow } from '../three/stellar-glow';
import { useCursorZoom } from '../three/use-cursor-zoom';
import { CanvasBoundary } from '../three/canvas-boundary';
import { systemHandoffDistanceAu, oortRadius, zoomLayers, type ZoomHandoff, type ZoomScale } from '../utils/zoom';

/** 선택된 천체 id. null 은 계 전체 보기. */
export type Target = string | null;
export type Overview = 'outer' | 'distant' | 'oort' | null;

export type SceneProps = {
  system: StarSystem;
  target: Target;
  hoveredTarget: Target;
  overview: Overview;
  paused: boolean;
  simulationDaysRef: RefObject<number>;
  recenter: number;
  onSelect: (target: Target) => void;
  onScaleChange: (scale: ZoomScale) => void;
  reportDistance: ReportDistanceScale;
  entry?: ZoomHandoff;
  onZoomOut?: (handoff: ZoomHandoff) => void;
  onHoverBody: (target: string, x: number, y: number) => void;
  onLeaveBody: (target: string) => void;
};

const ORIGIN = new Vector3();
const INITIAL_VIEW = new Vector3(0, 0.82, 1).normalize();
const DEFAULT_FOCUS_SCALE = 6.75;
const ORBIT_OPACITY = 0.19;
const SELECTED_ORBIT_OPACITY = 0.6;
const HOVERED_ORBIT_OPACITY = 0.72;

function findBody(system: StarSystem, id: Target) {
  return id === null ? undefined : system.bodies.find((body) => body.id === id);
}

function distantDistance(system: StarSystem) {
  return Math.max(
    system.wideOverview?.distance ?? system.overviewDistance,
    ...system.bodies.map((body) => (body.region && body.orbit ? 2.9 * UNITS_PER_AU * body.orbit.axisAu * (1 + body.orbit.eccentricity) : 0)),
  );
}

function cameraClipping(system: StarSystem, radius: number, cloudOpacity: number, farOverview: number) {
  return {
    near: MathUtils.clamp(radius * 0.001, 0.035, 1200),
    far: Math.max(6500, farOverview * 4, radius * 1.3 + (cloudOpacity > 0 ? oortRadius(system) * 1.2 : 0)),
  };
}

function focusDistance(system: StarSystem, target: Target, overview: Overview, farOverview: number) {
  const body = findBody(system, target);
  if (body) return body.displayRadius * (body.focusScale ?? DEFAULT_FOCUS_SCALE);
  if (overview === 'oort' && system.oortCloud) return oortRadius(system) * 2.85;
  if (overview === 'distant') return farOverview;
  return overview === 'outer' ? (system.outerRegion?.overviewDistance ?? system.overviewDistance) : system.overviewDistance;
}

type BodyEvents = (getId: (event: ThreeEvent<PointerEvent>) => string | undefined) => {
  onPointerMove(event: ThreeEvent<PointerEvent>): void;
  onPointerOut(event: ThreeEvent<PointerEvent>): void;
  onPointerDown(event: ThreeEvent<PointerEvent>): void;
};

function Star({
  body,
  days,
  paused,
  events,
  onSelect,
  visible,
}: {
  body: Body;
  days: RefObject<number>;
  paused: boolean;
  events: BodyEvents;
  onSelect: SceneProps['onSelect'];
  visible: RefObject<boolean>;
}) {
  const surface = useRef<ShaderMaterial>(null);
  const [uniforms] = useState(() => ({
    surfacePhase: { value: 0 },
    surfaceShear: { value: 0 },
    surfaceDark: { value: new Color(body.colors[0]).convertLinearToSRGB() },
    surfaceHot: { value: new Color(body.colors[1]).convertLinearToSRGB() },
  }));
  useFrame(() => {
    if (!surface.current) return;
    const material = surface.current.uniforms;
    const time = days.current;
    material.surfacePhase.value = rotationPhase(time, body.spinDays);
    material.surfaceShear.value = stellarTextureShear(time, body.spinDays, body.stellar?.poleSpinDays);
  });

  return (
    <>
      <mesh
        raycast={function (this: Mesh, raycaster, intersections) {
          if (visible.current) Mesh.prototype.raycast.call(this, raycaster, intersections);
        }}
        {...events(() => body.id)}
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta <= 4) onSelect(body.id);
        }}
      >
        <sphereGeometry args={[body.displayRadius, 96, 64]} />
        <shaderMaterial ref={surface} uniforms={uniforms} vertexShader={surfaceVertex} fragmentShader={surfaceFragment} />
      </mesh>
      <StellarGlow radius={body.displayRadius} color={body.stellar?.emissionColor ?? body.colors[2]} paused={paused} />
    </>
  );
}

function Scene({
  system,
  target,
  hoveredTarget,
  overview,
  paused,
  simulationDaysRef,
  recenter,
  onSelect,
  onScaleChange,
  reportDistance,
  entry,
  onZoomOut,
  onHoverBody,
  onLeaveBody,
  farOverview,
}: SceneProps & { farOverview: number }) {
  const motions = useMemo(() => createMotions(system), [system]);
  const illumination = useMemo(() => {
    const hosts: Record<string, string> = {};
    return Object.fromEntries(
      system.bodies.map((body) => {
        const host = body.kind === 'star' ? body.id : body.parent ? hosts[body.parent] : system.bodies[0].id;
        hosts[body.id] = host;
        return [body.id, { host, offset: new Vector3() }];
      }),
    );
  }, [system]);
  // 위성은 전체 보기에서 모행성과 겹치므로 마커·궤도선을 숨긴다.
  const satellites = useMemo(() => new Set(system.bodies.filter((body) => isSatellite(system, body)).map((body) => body.id)), [system]);
  const markerBodies = useMemo(() => system.bodies.filter((body) => !satellites.has(body.id)), [system, satellites]);
  const markerColors = useMemo(() => new Float32Array(markerBodies.flatMap((body) => new Color(body.colors[2]).toArray())), [markerBodies]);
  const markerPositions = useMemo(() => new Float32Array(markerBodies.length * 3), [markerBodies]);
  const root = system.bodies[0];
  const targetBody = findBody(system, target);
  const satelliteParent = targetBody && satellites.has(targetBody.id) ? targetBody.parent : target;

  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const cursorZoomRef = useCursorZoom();
  const bodies = useRef<Record<string, Group | undefined>>({});
  const spins = useRef<Record<string, Group | undefined>>({});
  const orbitAnchors = useRef<Record<string, Group | undefined>>({});
  const markers = useRef<Points>(null);
  const markerMaterial = useRef<PointsMaterial>(null);
  const belt = useRef<Mesh>(null);
  const beltMaterial = useRef<MeshBasicMaterial>(null);
  const cloudOpacity = useRef(0);
  const systemVisible = useRef(true);
  const lastScale = useRef<ZoomScale | null>(null);
  const backdrop = useRef<Group>(null);
  const days = simulationDaysRef;
  const destination = useRef<number | null>(null);
  const distanceAtStart = useRef(0);
  const [initialRequest] = useState(() => ({ target, overview, recenter }));
  const [initialTarget] = useState(() => (!entry && target ? setWorldPosition(system, motions, target, new Vector3(), 0) : new Vector3()));
  const [scratch] = useState(() => ({ offset: new Vector3(), focus: new Vector3(), previousBodyPosition: new Vector3(), translation: new Vector3() }));
  const { width, height } = useThree((state) => state.size);
  const aspect = width / Math.max(height, 1);
  const distance = focusDistance(system, target, overview, farOverview) * Math.max(1, (target === null ? 0.92 : 0.62) / Math.max(aspect, 0.35));

  useEffect(() => {
    if (entry && target === initialRequest.target && overview === initialRequest.overview && recenter === initialRequest.recenter) return;
    cursorZoomRef.current = false;
    destination.current = distance;
  }, [target, overview, distance, recenter, entry, initialRequest, cursorZoomRef]);

  useFrame(({ camera }, delta) => {
    if (!controls.current) return;

    const orbitControls = controls.current;
    const trackedBody = target ? bodies.current[target] : undefined;

    // bodies 는 부모가 먼저 오므로 부모 위치가 이미 갱신돼 있다.
    for (const body of system.bodies) {
      const group = bodies.current[body.id];
      if (!group) continue;
      const parent = body.parent ? bodies.current[body.parent] : undefined;
      motions[body.id].setLocalPosition(group.position, days.current);
      if (parent) group.position.add(parent.position);
      orbitAnchors.current[body.id]?.position.copy(parent?.position ?? ORIGIN);
      const light = illumination[body.id];
      light.offset.subVectors(bodies.current[light.host]?.position ?? ORIGIN, group.position);

      const spin = spins.current[body.id];
      if (spin && body.spinDays) spin.rotation.y = rotationPhase(days.current, body.spinDays);
    }
    scratch.offset.subVectors(camera.position, orbitControls.target);
    const currentRadius = scratch.offset.length();
    const goal = destination.current;
    const weight = 1 - Math.exp(-5 * delta);
    // Interpolate the logarithm so presets travel at a comparable speed across every scale.
    const radius = goal === null ? currentRadius : Math.exp(MathUtils.lerp(Math.log(currentRadius), Math.log(goal), weight));
    const sparseZoom = onZoomOut && !system.oortCloud ? MathUtils.smoothstep(Math.log(radius / farOverview), Math.log(2), Math.log(12)) : 0;
    orbitControls.zoomSpeed = 2.25 + 3.75 * sparseZoom;
    const layers = zoomLayers(system, radius, farOverview);
    const bodyPosition = trackedBody?.position ?? ORIGIN;
    const focus = scratch.focus.copy(bodyPosition).multiplyScalar(layers.systemOpacity);
    if (goal === null && cursorZoomRef.current) {
      // Follow the selected body's motion without discarding the cursor's offset from it.
      orbitControls.target.add(scratch.translation.subVectors(bodyPosition, scratch.previousBodyPosition));
    } else if (goal === null) {
      focus.lerp(ORIGIN, MathUtils.smoothstep(radius, farOverview, farOverview * 2.8));
      orbitControls.target.copy(focus);
    } else {
      orbitControls.target.lerp(focus, weight);
      if (orbitControls.target.distanceToSquared(focus) < 0.0001 && Math.abs(Math.log(radius / goal)) < 0.0001) {
        orbitControls.target.copy(focus);
        destination.current = null;
      }
    }
    scratch.previousBodyPosition.copy(bodyPosition);
    camera.position.copy(orbitControls.target).add(scratch.offset.setLength(goal !== null && destination.current === null ? goal : radius));
    orbitControls.update();
    reportDistance(kmPerPixel(camera, height, orbitControls.getDistance(), KM_PER_AU / UNITS_PER_AU));
    backdrop.current?.position.copy(camera.position);

    const clipping = cameraClipping(system, radius, layers.cloudOpacity, farOverview);
    if (camera.near !== clipping.near || camera.far !== clipping.far) {
      camera.near = clipping.near;
      camera.far = clipping.far;
      camera.updateProjectionMatrix();
    }

    cloudOpacity.current = layers.cloudOpacity;
    systemVisible.current = layers.systemOpacity > 0.01;
    if (belt.current) belt.current.visible = layers.beltOpacity > 0.002;
    if (beltMaterial.current) beltMaterial.current.opacity = 0.11 * layers.beltOpacity;
    for (const body of system.bodies) {
      const show = systemVisible.current && bodyVisible(body);
      const mesh = bodies.current[body.id];
      if (mesh) mesh.visible = show;

      const anchor = orbitAnchors.current[body.id];
      if (anchor) {
        anchor.visible = show;
        const line = anchor.children[0] as Mesh | undefined;
        if (line && !Array.isArray(line.material)) {
          const opacity = body.id === hoveredTarget ? HOVERED_ORBIT_OPACITY : body.id === target ? SELECTED_ORBIT_OPACITY : ORBIT_OPACITY;
          line.material.opacity = opacity * layers.systemOpacity;
        }
      }
    }

    if (markers.current && markerMaterial.current) {
      markers.current.visible = systemVisible.current && radius > 55;
      markerMaterial.current.opacity = layers.systemOpacity * MathUtils.smoothstep(radius, 55, 110);
      if (markers.current.visible) {
        markerBodies.forEach((body, index) => bodies.current[body.id]?.position.toArray(markerPositions, index * 3));
        markers.current.geometry.attributes.position.needsUpdate = true;
        markers.current.geometry.computeBoundingSphere();
      }
    }

    if (layers.scale !== lastScale.current) {
      lastScale.current = layers.scale;
      onScaleChange(layers.scale);
    }
  });

  const events: BodyEvents = (getId) => ({
    onPointerMove(event) {
      const id = getId(event);
      if (!id || event.pointerType === 'touch' || event.buttons !== 0) return;
      event.stopPropagation();
      onHoverBody(id, event.clientX, event.clientY);
    },
    onPointerOut(event) {
      const id = getId(event);
      if (id) onLeaveBody(id);
    },
    onPointerDown(event) {
      const id = getId(event);
      if (id) onLeaveBody(id);
    },
  });

  function bodyVisible(body: Body) {
    return !satellites.has(body.id) || body.parent === satelliteParent;
  }

  return (
    <>
      <group ref={backdrop}>
        <Stars radius={2800} depth={850} count={2800} factor={190} saturation={0} fade speed={0} />
      </group>
      {system.oortCloud && <OortCloudModel cloud={system.oortCloud} opacity={cloudOpacity} />}
      {system.outerRegion && (
        <mesh ref={belt} rotation-x={-Math.PI / 2} raycast={() => {}}>
          <ringGeometry args={[system.outerRegion.beltAu[0] * UNITS_PER_AU, system.outerRegion.beltAu[1] * UNITS_PER_AU, 180]} />
          <meshBasicMaterial ref={beltMaterial} color="#7994bb" transparent opacity={0} depthWrite={false} side={DoubleSide} />
        </mesh>
      )}
      <ambientLight intensity={0.65} />
      {system.bodies.map((body) => (
        <group key={body.id}>
          {motions[body.id].points.length > 0 && (
            <group
              ref={(anchor) => {
                orbitAnchors.current[body.id] = anchor ?? undefined;
              }}
              visible={bodyVisible(body)}
            >
              <Line points={motions[body.id].points} color={body.colors[2]} transparent depthWrite={false} opacity={ORBIT_OPACITY} lineWidth={1} raycast={() => {}} />
            </group>
          )}
          <group
            visible={bodyVisible(body)}
            ref={(group) => {
              bodies.current[body.id] = group ?? undefined;
            }}
          >
            {body.kind === 'star' ? (
              <group quaternion={motions[body.id].orientation}>
                <pointLight intensity={1.9} decay={0} />
                <Star body={body} days={days} paused={paused} events={events} onSelect={onSelect} visible={systemVisible} />
              </group>
            ) : (
              <group quaternion={motions[body.id].orientation}>
                <group
                  ref={(spin) => {
                    spins.current[body.id] = spin ?? undefined;
                  }}
                >
                  {(body.lobes ?? [{ offset: [0, 0, 0] as const, shape: body.shape }]).map((part, index) => (
                    <mesh
                      key={index}
                      position={part.offset.map((value) => value * body.displayRadius) as [number, number, number]}
                      scale={part.shape}
                      raycast={function (this: Mesh, raycaster, intersections) {
                        if (systemVisible.current && bodyVisible(body)) Mesh.prototype.raycast.call(this, raycaster, intersections);
                      }}
                      {...events(() => body.id)}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (event.delta <= 4) onSelect(body.id);
                      }}
                    >
                      <sphereGeometry args={[body.displayRadius, 56, 40]} />
                      <PlanetMaterial body={body} lightOffset={illumination[body.id].offset} />
                    </mesh>
                  ))}
                </group>
                <PlanetRings body={body} />
              </group>
            )}
          </group>
        </group>
      ))}
      <points
        ref={markers}
        frustumCulled={false}
        {...events((event) => (event.index === undefined ? undefined : markerBodies[event.index]?.id))}
        raycast={function (this: Points, raycaster, intersections) {
          if (!this.visible) return;
          const options = raycaster.params.Points;
          const previousThreshold = options.threshold;
          options.threshold = raycaster.ray.origin.distanceTo(controls.current?.target ?? ORIGIN) * 0.003;
          try {
            Points.prototype.raycast.call(this, raycaster, intersections);
          } finally {
            options.threshold = previousThreshold;
          }
        }}
        onClick={(event) => {
          const selected = event.index === undefined ? undefined : markerBodies[event.index]?.id;
          if (event.delta <= 4 && selected) {
            event.stopPropagation();
            onSelect(selected);
          }
        }}
      >
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[markerPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[markerColors, 3]} />
        </bufferGeometry>
        <pointsMaterial ref={markerMaterial} vertexColors size={5} sizeAttenuation={false} transparent depthTest={false} depthWrite={false} />
      </points>
      <OrbitControls
        ref={controls}
        target={initialTarget}
        enablePan={false}
        zoomToCursor
        minDistance={(targetBody?.displayRadius ?? root.displayRadius) * (targetBody?.kind === 'star' || !targetBody ? 3.6 : 3.1)}
        maxDistance={Math.max(2600, farOverview * 2.65, oortRadius(system) * 8, onZoomOut ? systemHandoffDistanceAu(system, farOverview) * UNITS_PER_AU * 1.2 : 0)}
        zoomSpeed={2.25}
        onStart={() => {
          destination.current = null;
          distanceAtStart.current = controls.current?.getDistance() ?? 0;
        }}
        onEnd={() => {
          const orbit = controls.current;
          if (!orbit || !onZoomOut) return;
          const radius = orbit.getDistance();
          if (radius <= distanceAtStart.current || radius / UNITS_PER_AU < systemHandoffDistanceAu(system, farOverview)) return;
          const direction = scratch.offset.subVectors(orbit.object.position, orbit.target).normalize().toArray();
          onZoomOut({ distanceAu: radius / UNITS_PER_AU, direction });
        }}
      />
    </>
  );
}

export default function SystemScene(props: SceneProps) {
  const { t, catalogText } = useLanguage();
  const farOverview = useMemo(() => distantDistance(props.system), [props.system]);
  const [initialCamera] = useState(() => {
    const radius = props.entry
      ? (props.system.oortCloud ? props.entry.distanceAu : Math.min(props.entry.distanceAu, systemHandoffDistanceAu(props.system, farOverview) * 0.85)) * UNITS_PER_AU
      : focusDistance(props.system, props.target, props.overview, farOverview);
    const position = (props.entry ? new Vector3(...props.entry.direction) : props.system.initialView ? new Vector3(...props.system.initialView).normalize() : INITIAL_VIEW.clone()).multiplyScalar(
      radius,
    );
    if (!props.entry && props.target) position.add(setWorldPosition(props.system, createMotions(props.system), props.target, new Vector3(), 0));
    const { cloudOpacity } = zoomLayers(props.system, radius, farOverview);
    return { position, fov: 45, ...cameraClipping(props.system, radius, cloudOpacity, farOverview) };
  });

  return (
    <CanvasBoundary>
      <Canvas
        camera={initialCamera}
        dpr={[1, 1.5]}
        fallback={<span aria-hidden="true">{t('canvas.systemModel', [catalogText(props.system.name)])}</span>}
        aria-label={t('canvas.interactiveModel', [catalogText(props.system.name)])}
      >
        <Scene {...props} farOverview={farOverview} />
      </Canvas>
    </CanvasBoundary>
  );
}
