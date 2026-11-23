'use client';

import { useLanguage } from '@/i18n/language';
import { OrbitControls, Stars } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { Color, Points, Vector3, MathUtils, Mesh, type Camera, type Group, type LineLoop, type PointsMaterial, type ShaderMaterial } from 'three';
import { KM_PER_AU } from '@/constants/space/units';
import { kmPerPixel, type ReportDistanceScale } from '../utils/distance-scale';
import type { Body, StarSystem } from '@/constants/space';
import { createMotions, isSatellite, rotationPhase, setOrbitalPositionAu, setWorldPosition, stellarTextureShear, writeOrbitVertices, UNITS_PER_AU } from '../utils/orbit';
import { OortCloudModel } from '../three/planetary-systems/oort-cloud';
import { KuiperBelt } from '../three/planetary-systems/kuiper-belt';
import styles from '../explore.module.scss';
import { IcePlumes } from '../three/planetary-systems/ice-plumes';
import { ObservedBodyModel } from '../three/planetary-systems/observed-body-model';
import { PlanetMaterial, PlanetRings } from '../three/planetary-systems/planet-surface';
import { PlanetGeometry } from '../three/planetary-systems/outer-solar-surface';
import { JUPITER_RED_SPOT_LATITUDE, surfaceFragment, surfaceVertex } from '../three/shared/shaders';
import { SolarProminences } from '../three/stellar/solar-prominences';
import { NebulaVolume } from '../three/nebulae/nebula-volume';
import { STELLAR_WIND_RADIUS } from '../three/stellar/stellar-wind-density';
import { StellarGlow } from '../three/stellar/stellar-glow';
import { useSurfaceMap } from '../three/shared/use-surface-map';
import { useCursorZoom } from '../three/shared/use-cursor-zoom';
import { CanvasBoundary } from '../three/shared/canvas-boundary';
import { systemHandoffDistanceAu, oortRadius, zoomLayers, type ZoomHandoff, type ZoomScale } from '../utils/zoom';

/** 선택된 천체 id. null 은 계 전체 보기. */
export type Target = string | null;
export type Overview = 'outer' | 'distant' | 'oort' | null;

export type SceneProps = {
  system: StarSystem;
  target: Target;
  hoveredTarget: Target;
  distanceTarget: Target;
  comparisonTarget: Target;
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
  onHoverDistance: (origin: string, body: string, au: number) => void;
};

const ORIGIN = new Vector3();
const INITIAL_VIEW = new Vector3(0, 0.82, 1).normalize();
const SPIN_AXIS = new Vector3(0, 1, 0);
const RED_SPOT_LATITUDE = MathUtils.degToRad(JUPITER_RED_SPOT_LATITUDE);

const DEFAULT_FOCUS_SCALE = 6.75;
const ORBIT_OPACITY = 0.34;
const SELECTED_ORBIT_OPACITY = 0.6;
const HOVERED_ORBIT_OPACITY = 0.72;
const LABEL_GAP = 5;
const LABEL_MARGIN = 7;
type LabelBounds = { x: number; y: number; width: number; height: number };

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
    near: MathUtils.clamp(radius * 0.001, Math.min(0.035, system.overviewDistance * 0.02), 1200),
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
  focused,
  loadSurfaceMap,
}: {
  body: Body;
  days: RefObject<number>;
  paused: boolean;
  events: BodyEvents;
  onSelect: SceneProps['onSelect'];
  visible: RefObject<boolean>;
  focused: boolean;
  loadSurfaceMap: boolean;
}) {
  const surface = useRef<ShaderMaterial>(null);
  const activityDays = useRef(0.043);
  const pulse = useRef<import('three').MeshBasicMaterial>(null);
  const previousDays = useRef(days.current);
  const texture = useSurfaceMap(body.surfaceMap?.file, loadSurfaceMap);
  const isSun = body.stellar?.prominences === true;
  const photosphere = body.stellar?.photosphere;
  const showDwarfFlares = focused && photosphere?.flarePreview === true;
  const [uniforms] = useState(() => ({
    surfacePhase: { value: 0 },
    surfaceMap: { value: null },
    hasSurfaceMap: { value: false },
    surfaceShear: { value: 0 },
    photosphere: { value: new Vector3(photosphere?.seed ?? 0, photosphere?.granuleScale ?? 0, photosphere?.activeRegions ?? 0) },
    convectionPhase: { value: 0 },
    dwarfFlares: { value: false },
    surfaceDark: { value: new Color(body.colors[0]).convertLinearToSRGB() },
    surfaceHot: { value: new Color(body.colors[1]).convertLinearToSRGB() },
  }));
  useFrame((_, delta) => {
    const time = days.current;
    if (pulse.current && body.stellarPulseSeconds) {
      const angle = ((time * 86_400) / body.stellarPulseSeconds) * Math.PI * 2;
      pulse.current.opacity = 0.04 + 0.52 * Math.pow(0.5 + 0.5 * Math.cos(angle), 5);
    }
    if ((isSun || (photosphere && photosphere.granuleScale > 0)) && !paused && delta > 0) {
      // Keep the activity preview legible across the orbital playback speeds.
      const rate = MathUtils.clamp((time - previousDays.current) / delta, 1 / 1440, 1 / 120);
      activityDays.current += rate * Math.min(delta, 0.1);
    }
    previousDays.current = time;
    if (!surface.current) return;
    const material = surface.current.uniforms;
    material.surfaceMap.value = texture ?? null;
    material.hasSurfaceMap.value = texture !== undefined;
    material.surfacePhase.value = rotationPhase(time, body.spinDays);
    material.surfaceShear.value = stellarTextureShear(time, body.spinDays, body.stellar?.poleSpinDays);
    material.convectionPhase.value = activityDays.current;
    material.dwarfFlares.value = showDwarfFlares;
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
      <StellarGlow
        radius={body.displayRadius}
        color={body.stellar?.emissionColor ?? body.colors[2]}
        strength={body.stellar?.glowStrength}
        paused={paused}
        activityDays={isSun ? activityDays : undefined}
      />
      {body.stellarPulseSeconds && (
        <mesh raycast={() => {}}>
          <sphereGeometry args={[body.displayRadius * 1.003, 48, 32]} />
          <meshBasicMaterial ref={pulse} color="#fff0cc" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      )}
      {isSun && <SolarProminences radius={body.displayRadius} days={days} activityDays={activityDays} spinDays={body.spinDays} poleSpinDays={body.stellar?.poleSpinDays} />}
      {isSun && focused && <NebulaVolume shape="solar-wind" radius={body.displayRadius * STELLAR_WIND_RADIUS} activityDays={activityDays} />}
    </>
  );
}

function Scene({
  system,
  target,
  hoveredTarget,
  distanceTarget,
  comparisonTarget,
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
  onHoverDistance,
  farOverview,
  showHiddenSurface,
  labels,
}: SceneProps & { farOverview: number; showHiddenSurface: boolean; labels: RefObject<Record<string, HTMLButtonElement | null>> }) {
  const motions = useMemo(() => createMotions(system), [system]);
  // 동작 줄이기 설정이면 카메라가 목표로 바로 이동한다.
  const reduceMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const orbitPaths = useMemo(() => Object.fromEntries(system.bodies.map((body) => [body.id, { vertices: new Float32Array(motions[body.id].points), origin: new Vector3() }])), [system, motions]);
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
  const showBodyLabels = system.home === true && targetBody !== undefined;
  const satelliteParent = targetBody && satellites.has(targetBody.id) ? targetBody.parent : target;

  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const cursorZoomRef = useCursorZoom();
  const bodies = useRef<Record<string, Group | undefined>>({});
  const labelBounds = useRef(new Map<string, LabelBounds>());
  const distanceSample = useRef<{ origin: string; body: string; next: number } | null>(null);
  const spins = useRef<Record<string, Group | undefined>>({});
  const orbitAnchors = useRef<Record<string, Group | undefined>>({});
  const markers = useRef<Points>(null);
  const markerMaterial = useRef<PointsMaterial>(null);
  const beltOpacity = useRef(0);
  const cloudOpacity = useRef(0);
  const systemVisible = useRef(true);
  const lastScale = useRef<ZoomScale | null>(null);
  const backdrop = useRef<Group>(null);
  const days = simulationDaysRef;
  const destination = useRef<number | null>(null);
  const revealRedSpot = useRef(false);
  const distanceAtStart = useRef(0);
  const [initialRequest] = useState(() => ({ target, overview, recenter }));
  const [initialTarget] = useState(() => (!entry && target ? setWorldPosition(system, motions, target, new Vector3(), 0) : new Vector3()));
  const [scratch] = useState(() => ({ offset: new Vector3(), focus: new Vector3(), previousBodyPosition: new Vector3(), translation: new Vector3() }));
  const [distanceScratch] = useState(() => ({ origin: new Vector3(), body: new Vector3(), local: new Vector3() }));
  const [labelPoint] = useState(() => new Vector3());
  const [surfacePoint] = useState(() => new Vector3());
  const [nearbySurfaceMaps, setNearbySurfaceMaps] = useState<ReadonlySet<string>>(() => new Set());
  const nextSurfaceCheck = useRef(0);
  const mappedBodies = useMemo(() => system.bodies.filter((body) => body.surfaceMap && !body.surfaceMap.hidden), [system]);
  const { width, height } = useThree((state) => state.size);
  const aspect = width / Math.max(height, 1);
  const distance = focusDistance(system, target, overview, farOverview) * Math.max(1, (target === null ? 0.92 : 0.62) / Math.max(aspect, 0.35));

  useEffect(() => {
    if (entry && target === initialRequest.target && overview === initialRequest.overview && recenter === initialRequest.recenter) return;
    cursorZoomRef.current = false;
    destination.current = distance;
    revealRedSpot.current = targetBody?.surfaceEffect === 'red-spot';
  }, [target, targetBody, overview, distance, recenter, entry, initialRequest, cursorZoomRef]);

  useFrame(({ camera }, delta) => {
    if (!controls.current) return;

    const orbitControls = controls.current;
    const trackedBody = target ? bodies.current[target] : undefined;

    // bodies 는 부모가 먼저 오므로 부모 위치가 이미 갱신돼 있다.
    for (const body of system.bodies) {
      const group = bodies.current[body.id];
      if (!group) continue;
      const parent = body.parent ? bodies.current[body.parent] : undefined;
      const motion = motions[body.id];
      motion.setLocalPosition(group.position, days.current);
      const anchor = orbitAnchors.current[body.id];
      if (anchor) {
        const path = orbitPaths[body.id];
        const line = anchor.children[0] as LineLoop | undefined;
        if (line && body.id === target && group.position.distanceToSquared(path.origin) > (body.displayRadius * 32) ** 2) {
          // Subtract in double precision before uploading positions. A wide orbit's
          // barycentric coordinates can otherwise lose visible precision at body scale.
          path.origin.copy(group.position);
          writeOrbitVertices(motion.points, path.vertices, path.origin);
          line.geometry.attributes.position.needsUpdate = true;
          line.geometry.boundingSphere = null;
        }
        anchor.position.copy(parent?.position ?? ORIGIN).add(path.origin);
      }
      if (parent) group.position.add(parent.position);
      const light = illumination[body.id];
      light.offset.subVectors(bodies.current[light.host]?.position ?? ORIGIN, group.position);

      const spin = spins.current[body.id];
      if (spin && body.spinDays) spin.rotation.y = rotationPhase(days.current, body.spinDays);
    }
    scratch.offset.subVectors(camera.position, orbitControls.target);
    const currentRadius = scratch.offset.length();
    if (revealRedSpot.current && targetBody?.surfaceEffect === 'red-spot') {
      // Start on the storm-facing side at the current spin phase, then hand control back to the user.
      scratch.offset
        .set(0, Math.sin(RED_SPOT_LATITUDE), Math.cos(RED_SPOT_LATITUDE))
        .applyAxisAngle(SPIN_AXIS, rotationPhase(days.current, targetBody.spinDays))
        .applyQuaternion(motions[targetBody.id].orientation);
      revealRedSpot.current = false;
    }
    const goal = destination.current;
    const weight = reduceMotion ? 1 : 1 - Math.exp(-5 * delta);
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
    if (showBodyLabels && target && distanceTarget && target !== distanceTarget) {
      const now = performance.now();
      const sample = distanceSample.current;
      if (!sample || sample.origin !== target || sample.body !== distanceTarget || now >= sample.next) {
        const { origin, body, local } = distanceScratch;
        setOrbitalPositionAu(system, motions, target, origin, local, days.current);
        setOrbitalPositionAu(system, motions, distanceTarget, body, local, days.current);
        onHoverDistance(target, distanceTarget, origin.distanceTo(body));
        distanceSample.current = { origin: target, body: distanceTarget, next: now + 125 };
      }
    } else {
      distanceSample.current = null;
    }
    beltOpacity.current = layers.beltOpacity;
    for (const body of system.bodies) {
      const show = systemVisible.current && bodyVisible(body);
      const mesh = bodies.current[body.id];
      if (mesh) mesh.visible = show;

      const anchor = orbitAnchors.current[body.id];
      if (anchor) {
        anchor.visible = show;
        const line = anchor.children[0] as LineLoop | undefined;
        if (line && !Array.isArray(line.material)) {
          const opacity = body.id === hoveredTarget || body.id === comparisonTarget ? HOVERED_ORBIT_OPACITY : body.id === target ? SELECTED_ORBIT_OPACITY : ORBIT_OPACITY;
          line.material.opacity = opacity * layers.systemOpacity;
        }
      }
    }
    const now = performance.now();
    if (systemVisible.current && now >= nextSurfaceCheck.current) {
      nextSurfaceCheck.current = now + 150;
      const candidates: string[] = [];
      for (const body of mappedBodies) {
        const group = bodies.current[body.id];
        if (!group?.visible || shouldLoadSurfaceMap(body)) continue;

        surfacePoint.copy(group.position).applyMatrix4(camera.matrixWorldInverse);
        const depth = -surfacePoint.z;
        if (depth <= 0) continue;
        const diameter = (body.displayRadius * camera.projectionMatrix.elements[5] * height) / depth;
        if (diameter < 24) continue;
        surfacePoint.applyMatrix4(camera.projectionMatrix);
        if (Math.abs(surfacePoint.x) <= 1 + diameter / width && Math.abs(surfacePoint.y) <= 1 + diameter / height) {
          candidates.push(body.id);
        }
      }
      if (candidates.length) setNearbySurfaceMaps((available) => new Set([...available, ...candidates]));
    }
    if (showBodyLabels) placeLabels(camera);

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

  function shouldLoadSurfaceMap(body: Body) {
    if (body.surfaceMap?.hidden) return showHiddenSurface && target === body.id;
    return body.id === target || body.id === satelliteParent || nearbySurfaceMaps.has(body.id);
  }

  function bodyVisible(body: Body) {
    return !satellites.has(body.id) || body.parent === satelliteParent;
  }

  function projectLabel(camera: Camera, size: { width: number; height: number }, radius: number) {
    labelPoint.applyMatrix4(camera.matrixWorldInverse);
    const inFront = labelPoint.z < 0;
    const rim = Math.min(150, (radius * camera.projectionMatrix.elements[5] * size.height) / (2 * Math.max(0.001, -labelPoint.z)));
    labelPoint.applyMatrix4(camera.projectionMatrix);
    const x = ((1 + labelPoint.x) * size.width) / 2;
    const y = ((1 - labelPoint.y) * size.height) / 2;
    return { x, y, rim, inFront, anchorX: x + rim * 0.52 + 9, anchorY: y + rim * 0.9 + 9 };
  }

  function placeLabels(camera: Camera) {
    camera.updateMatrixWorld();
    const previous = labelBounds.current;
    const occupied: LabelBounds[] = [];
    const overlay = Object.values(labels.current).find(Boolean)?.parentElement;
    const explorer = overlay?.closest('main');
    if (overlay && explorer) {
      const viewport = overlay.getBoundingClientRect();
      for (const panel of explorer.querySelectorAll(`.${styles.details}, .${styles.playback}`)) {
        const bounds = panel.getBoundingClientRect();
        if (bounds.top < viewport.bottom && bounds.bottom > viewport.top) {
          occupied.push({ x: bounds.left - viewport.left, y: bounds.top - viewport.top, width: bounds.width, height: bounds.height });
        }
      }
    }
    const panelCount = occupied.length;
    const entries = system.bodies.flatMap((body) => {
      const button = labels.current[body.id];
      const group = bodies.current[body.id];
      if (!button || !group) return [];
      const priority = body.id === target ? 3 : body.id === hoveredTarget || body.id === comparisonTarget || button === document.activeElement ? 2 : 1;
      labelPoint.copy(group.position);
      const position = projectLabel(camera, { width, height }, body.displayRadius);
      const onScreen = group.visible && position.inFront && position.x >= 0 && position.x <= width && position.y >= 0 && position.y <= height;
      return [{ id: body.id, button, priority, position, onScreen, width: button.offsetWidth, height: button.offsetHeight }];
    });
    entries.sort((a, b) => b.priority - a.priority);
    for (const entry of entries) {
      const { id, button, priority, position, onScreen } = entry;
      const { x, y, rim, anchorX, anchorY } = position;
      const old = previous.get(id);
      const candidates = [
        [anchorX, anchorY],
        [x + rim + 9, y - entry.height / 2],
        [x - rim - entry.width - 9, y - entry.height / 2],
        [x - entry.width / 2, y - rim - entry.height - 7],
        [x - entry.width / 2, y + rim + 7],
        [anchorX, anchorY + entry.height + LABEL_GAP],
        [x - entry.width / 2, y - rim - 2 * (entry.height + LABEL_GAP)],
      ];
      for (const panel of occupied.slice(0, panelCount)) {
        const top = panel.y - entry.height - LABEL_GAP;
        if (top >= LABEL_MARGIN && y >= top && y - top <= rim + 125) {
          candidates.push([anchorX, top], [x - entry.width - 9, top]);
        }
      }
      // A promoted hover label stays under the pointer when nearby labels move.
      if (priority === 2 && old && Math.hypot(old.x - anchorX, old.y - anchorY) < rim + 90) {
        candidates.unshift([old.x, old.y]);
      }
      const fits = (bounds: LabelBounds) =>
        occupied.every(
          (other) =>
            bounds.x + bounds.width + LABEL_GAP <= other.x ||
            other.x + other.width + LABEL_GAP <= bounds.x ||
            bounds.y + bounds.height + LABEL_GAP <= other.y ||
            other.y + other.height + LABEL_GAP <= bounds.y,
        );
      const bounds =
        onScreen &&
        candidates
          .map(([left, top]) => ({
            x: MathUtils.clamp(left, LABEL_MARGIN, Math.max(LABEL_MARGIN, width - entry.width - LABEL_MARGIN)),
            y: MathUtils.clamp(top, LABEL_MARGIN, Math.max(LABEL_MARGIN, height - entry.height - LABEL_MARGIN)),
            width: entry.width,
            height: entry.height,
          }))
          .find(fits);
      button.style.visibility = bounds ? 'visible' : 'hidden';
      if (!bounds) {
        previous.delete(id);
        continue;
      }
      occupied.push(bounds);
      previous.set(id, bounds);
      button.style.translate = `${Math.round(bounds.x)}px ${Math.round(bounds.y)}px`;
    }
  }

  return (
    <>
      <group ref={backdrop}>
        <Stars radius={2800} depth={850} count={2800} factor={190} saturation={0} fade speed={0} />
      </group>
      {system.oortCloud && <OortCloudModel cloud={system.oortCloud} opacity={cloudOpacity} />}
      {system.outerRegion && <KuiperBelt beltAu={system.outerRegion.beltAu} opacity={beltOpacity} />}
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
              <lineLoop raycast={() => {}}>
                <bufferGeometry>
                  <bufferAttribute attach="attributes-position" args={[orbitPaths[body.id].vertices, 3]} />
                </bufferGeometry>
                <lineBasicMaterial color={body.colors[2]} transparent depthWrite={false} opacity={ORBIT_OPACITY} />
              </lineLoop>
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
                <Star body={body} days={days} paused={paused} events={events} onSelect={onSelect} visible={systemVisible} focused={target === body.id} loadSurfaceMap={shouldLoadSurfaceMap(body)} />
              </group>
            ) : (
              <group quaternion={motions[body.id].orientation}>
                <group
                  ref={(spin) => {
                    spins.current[body.id] = spin ?? undefined;
                  }}
                >
                  {body.shapeModel && bodyVisible(body) && (target === body.id || satelliteParent === body.parent) ? (
                    <group
                      {...events(() => (systemVisible.current ? body.id : undefined))}
                      onClick={(event) => {
                        if (!systemVisible.current) return;
                        event.stopPropagation();
                        if (event.delta <= 4) onSelect(body.id);
                      }}
                    >
                      <Suspense
                        fallback={
                          <mesh>
                            <sphereGeometry args={[body.displayRadius, 32, 24]} />
                            <PlanetMaterial body={body} lightOffset={illumination[body.id].offset} loadSurfaceMap={false} />
                          </mesh>
                        }
                      >
                        <ObservedBodyModel file={body.shapeModel} radius={body.displayRadius} />
                      </Suspense>
                    </group>
                  ) : (
                    (body.lobes ?? [{ offset: [0, 0, 0] as const, shape: body.shape }]).map((part, index) => (
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
                        <PlanetGeometry radius={body.displayRadius} body={body} />
                        <PlanetMaterial
                          body={body}
                          lightOffset={illumination[body.id].offset}
                          loadSurfaceMap={shouldLoadSurfaceMap(body)}
                          showSurfaceMap={!body.surfaceMap?.hidden || (showHiddenSurface && target === body.id)}
                        />
                      </mesh>
                    ))
                  )}
                  {body.surfaceEffect === 'ice-plumes' && target === body.id && <IcePlumes radius={body.displayRadius} paused={paused} />}
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
        minDistance={(targetBody?.displayRadius ?? root.displayRadius) * (targetBody?.kind === 'star' || !targetBody ? 3.6 : 3.1)}
        maxDistance={Math.max(2600, farOverview * 2.65, oortRadius(system) * 8, onZoomOut ? systemHandoffDistanceAu(system, farOverview) * UNITS_PER_AU * 1.2 : 0)}
        zoomSpeed={2.25}
        onStart={() => {
          destination.current = null;
          revealRedSpot.current = false;
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
  const labels = useRef<Record<string, HTMLButtonElement | null>>({});
  const [showHiddenSurface, setShowHiddenSurface] = useState(false);
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
      <div className={styles.systemCanvas} role="group" aria-label={t('canvas.interactiveModel', [catalogText(props.system.name)])}>
        <Canvas camera={initialCamera} dpr={[1, 1.5]} fallback={<span aria-hidden="true">{t('canvas.systemModel', [catalogText(props.system.name)])}</span>}>
          <Scene {...props} farOverview={farOverview} showHiddenSurface={showHiddenSurface} labels={labels} />
        </Canvas>
        {props.system.home && props.target && (
          <div className={styles.solarBodyLabels}>
            {props.system.bodies.map((body) => (
              <button
                key={body.id}
                type="button"
                ref={(element) => {
                  labels.current[body.id] = element;
                }}
                className={styles.solarBodyLabel}
                aria-current={body.id === props.target ? 'true' : undefined}
                data-comparison-target={body.id === props.comparisonTarget}
                data-hovered={body.id === props.hoveredTarget}
                onPointerMove={(event) => {
                  if (event.pointerType !== 'touch' && event.buttons === 0) props.onHoverBody(body.id, event.clientX, event.clientY);
                }}
                onPointerLeave={() => props.onLeaveBody(body.id)}
                onPointerDown={() => props.onLeaveBody(body.id)}
                onClick={() => {
                  if (body.id !== props.target) props.onSelect(body.id);
                }}
              >
                {catalogText(body.name)}
              </button>
            ))}
          </div>
        )}
      </div>
      {findBody(props.system, props.target)?.surfaceMap?.hidden && (
        <button className={styles.surfaceViewButton} type="button" aria-pressed={showHiddenSurface} onClick={() => setShowHiddenSurface((show) => !show)}>
          {t('navigation.titanSurface')}
        </button>
      )}
    </CanvasBoundary>
  );
}
