'use client';

import type { CatalogText } from '@/i18n/messages';
import { useLanguage } from '@/i18n/language';
import { Line, OrbitControls, Stars } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type ComponentRef } from 'react';
import { Box3, Color, MathUtils, Quaternion, Vector3, type Group, type Points } from 'three';
import { localGroup, type Galaxy } from '@/constants/space';
import { AU_PER_KPC, KM_PER_AU } from '@/constants/space/units';
import { useCursorZoom } from '../three/use-cursor-zoom';
import { CanvasBoundary } from '../three/canvas-boundary';
import { updatePointDetail } from '../three/map-detail';
import { GalacticLabelLayer, GalacticMarker } from '../three/galactic-marker';
import { kmPerPixel, type ReportDistanceScale } from '../utils/distance-scale';
import { EXTERNAL_SYSTEM_ENTRY_KPC, EXTERNAL_SYSTEM_RETURN_KPC, GALAXY_ENTRY_KPC, GALAXY_EXIT_KPC, LOCAL_GROUP_EXIT_KPC, type ZoomHandoff } from '../utils/zoom';

type Props = {
  systemMarkers: readonly { id: string; name: CatalogText; position: readonly [number, number, number] }[];
  objectMarkers: readonly { id: string; name: CatalogText; color: string; position: readonly [number, number, number] }[];
  onSelectObject: (id: string) => void;
  onSelectSystem: (id: string, entry?: ZoomHandoff) => void;
  focusedSystemId?: string;
  overview: boolean;
  galaxy: Galaxy;
  entry?: ZoomHandoff;
  reportDistance: ReportDistanceScale;
  onEnterGalaxy: (galaxy: Galaxy, entry?: ZoomHandoff) => void;
  onExitGalaxy: (entry: ZoomHandoff) => void;
  onExitGroup: (entry: ZoomHandoff) => void;
};

const positions = localGroup.galaxies.map((galaxy) => {
  const ra = MathUtils.degToRad(galaxy.skyPosition?.rightAscension ?? 0);
  const dec = MathUtils.degToRad(galaxy.skyPosition?.declination ?? 0);
  return new Vector3(Math.cos(dec) * Math.cos(ra), Math.sin(dec), -Math.cos(dec) * Math.sin(ra)).multiplyScalar(galaxy.distanceKpc);
});
const reference = positions.find((position) => position.length() > 500);
if (reference) {
  const rotation = new Quaternion().setFromUnitVectors(reference.clone().normalize(), new Vector3(1, 0, 0));
  for (const position of positions) position.applyQuaternion(rotation);
}
const galaxyPositions = new Map(localGroup.galaxies.map((galaxy, index) => [galaxy.id, positions[index]]));
const origin = new Vector3();
const nearbyGalaxies = localGroup.galaxies.filter(({ distanceKpc }) => distanceKpc < 100);
const GROUP_CENTER = new Box3().setFromPoints(positions).getCenter(new Vector3());
const VIEW = new Vector3(0, 0.48, 1).normalize();
const CAMERA = { position: [0, 0, 115] as [number, number, number], fov: 45, near: 0.1, far: 10_000 };

function model(galaxy: Galaxy, count: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  let seed = 119 + galaxy.modelRadiusKpc * 100;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  }
  const morphology = galaxy.morphology;
  const irregular = morphology === 'irregular' || morphology === 'barred-irregular';
  const openSpiral = morphology === 'open-spiral';
  const barredSpiral = morphology === 'barred-spiral';
  const compactElliptical = morphology === 'compact-elliptical';
  const hasDustLane = morphology === 'dust-lane-elliptical';
  const giantElliptical = morphology === 'giant-elliptical' || hasDustLane;
  const elliptical = compactElliptical || giantElliptical || morphology === 'dwarf-elliptical';
  const ellipsoidY = giantElliptical ? 0.82 : compactElliptical ? 0.75 : 0.5;
  const ellipsoidZ = giantElliptical ? 0.87 : compactElliptical ? 0.85 : 0.59;
  const ellipsoidConcentration = giantElliptical ? 1.35 : compactElliptical ? 1.85 : 0.95;
  const bulgeColor = new Color('#ffe0a9');
  const armColor = new Color('#8daeff');
  const diskColor = new Color(galaxy.color);
  const tint = new Color();
  for (let i = 0; i < count; i++) {
    if (elliptical) {
      const r = galaxy.modelRadiusKpc * random() ** ellipsoidConcentration;
      const angle = random() * Math.PI * 2;
      const polar = random() * 2 - 1;
      const plane = Math.sqrt(1 - polar * polar);
      const index = i * 3;
      const x = r * plane * Math.cos(angle);
      const y = r * polar * ellipsoidY;
      const z = r * plane * Math.sin(angle) * ellipsoidZ;
      positions.set([x, y, z], index);
      const inDustLane = hasDustLane && Math.abs(y - 0.18 * x) < galaxy.modelRadiusKpc * 0.055;
      const shading = inDustLane ? 0.12 : 1;
      tint
        .copy(diskColor)
        .lerp(bulgeColor, 0.28 * (1 - r / galaxy.modelRadiusKpc))
        .multiplyScalar((0.14 + random() * 0.7) * shading);
      tint.toArray(colors, index);
      continue;
    }
    const compactCore = random() < (irregular ? 0.27 : openSpiral ? 0.06 : 0.18);
    const arm = !irregular && !compactCore && random() < 0.63;
    const size = galaxy.modelRadiusKpc;
    const radial = compactCore ? (irregular ? 0.57 : 0.24) * random() ** 1.6 : irregular ? 0.96 * random() ** 0.8 : 0.12 + 0.88 * random() ** 1.45;
    const r = size * radial;
    const angle = arm ? (i % 2) * Math.PI + (openSpiral ? 1.65 : 2.5) * Math.log(r / 4) + (random() - 0.5) * 0.75 : random() * Math.PI * 2;
    const brightness = 0.16 + 0.75 * random();
    const dustLane = arm && Math.sin(12 * radial + 2 * angle) > 0.62;
    const bar = (morphology === 'barred-irregular' || barredSpiral) && compactCore;
    const asymmetry = irregular ? 0.78 + 0.2 * Math.sin(2 * angle) + 0.15 * Math.cos(3 * angle) : 1;
    const x = r * Math.cos(angle) * asymmetry * (bar ? (barredSpiral ? 2.4 : 1.35) : 1);
    const z = r * Math.sin(angle) * asymmetry * (bar ? 0.24 : irregular ? 0.67 : 1);
    const thickness = irregular ? size * (morphology === 'irregular' ? 0.45 : 0.18) : compactCore ? size * 0.18 : size * 0.027;
    positions.set([x, (random() - 0.5) * thickness * (1 - radial), z], i * 3);
    tint.copy((compactCore && !irregular) || bar ? bulgeColor : arm ? armColor : diskColor).multiplyScalar(brightness * (dustLane ? 0.24 : 1));
    tint.toArray(colors, i * 3);
  }
  return { positions, colors };
}

function GalaxyDisk({ galaxy, compact }: { galaxy: Galaxy; compact: boolean }) {
  const points = useMemo(() => model(galaxy, compact ? 3000 : 28_000), [compact, galaxy]);
  const disk = useRef<Points>(null);
  const position = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    if (disk.current) updatePointDetail(disk.current, position, camera, size.height, galaxy.modelRadiusKpc);
  });
  return (
    <points ref={disk} rotation-x={galaxy.diskTilt ?? 0} raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[points.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial vertexColors size={compact ? 1.7 : 1.35} sizeAttenuation={false} transparent opacity={0.82} depthWrite={false} />
    </points>
  );
}

function Scene({ overview, galaxy, entry, reportDistance, onEnterGalaxy, onExitGalaxy, onExitGroup, systemMarkers, objectMarkers, onSelectObject, onSelectSystem, focusedSystemId }: Props) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const cursorZoomRef = useCursorZoom();
  const background = useRef<Group>(null);
  const start = useRef(0);
  const camera = useThree((state) => state.camera);
  const { width, height } = useThree((state) => state.size);
  const scratch = useMemo(() => ({ aim: new Vector3(), offset: new Vector3() }), []);
  const focusedSystem = !overview ? (systemMarkers.find(({ id }) => id === focusedSystemId) ?? systemMarkers[0]) : undefined;
  const focusPosition = focusedSystem?.position;
  const galaxyPosition = galaxyPositions.get(galaxy.id) ?? origin;
  // Small galaxies should open at a scale where their structure is already visible.
  const exitDistance = Math.min(GALAXY_EXIT_KPC, Math.max(24, galaxy.modelRadiusKpc * 8.5));
  const entryDistance = exitDistance * (GALAXY_ENTRY_KPC / GALAXY_EXIT_KPC);
  const defaultRadius = (overview ? 1250 : Math.min(112, galaxy.modelRadiusKpc * 3.8)) * Math.max(1, (0.86 * height) / Math.max(1, width));

  const groupExit = Math.max(LOCAL_GROUP_EXIT_KPC, defaultRadius * 1.28);

  useLayoutEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    cursorZoomRef.current = false;
    const returnFromSystem = entry && !overview && focusedSystemId && focusPosition;
    const distance = returnFromSystem ? EXTERNAL_SYSTEM_RETURN_KPC : entry ? (overview ? entry.distanceAu / AU_PER_KPC : Math.min(defaultRadius, entry.distanceAu / AU_PER_KPC)) : defaultRadius;
    orbit.target.copy(overview && !entry ? GROUP_CENTER : overview ? galaxyPosition : origin);
    if (returnFromSystem) orbit.target.set(...focusPosition);
    const direction = entry ? scratch.offset.set(...entry.direction) : VIEW;
    camera.position.copy(orbit.target).addScaledVector(direction, distance);
    orbit.update();
  }, [camera, cursorZoomRef, defaultRadius, entry, focusPosition, focusedSystemId, galaxyPosition, overview, scratch]);

  useFrame(({ camera }) => {
    const orbit = controls.current;
    if (!orbit) return;
    const radius = orbit.getDistance();
    if (!cursorZoomRef.current && overview) {
      const weight = MathUtils.smoothstep(radius, exitDistance, 650);
      const center = scratch.aim.copy(galaxyPosition).lerp(GROUP_CENTER, weight);
      camera.position.add(scratch.offset.subVectors(center, orbit.target));
      orbit.target.copy(center);
      orbit.update();
    } else if (!cursorZoomRef.current && focusPosition) {
      const weight = MathUtils.smoothstep(radius, EXTERNAL_SYSTEM_RETURN_KPC, Math.max(4, galaxy.modelRadiusKpc * 0.72));
      const center = scratch.aim.set(...focusPosition).multiplyScalar(1 - weight);
      camera.position.add(scratch.offset.subVectors(center, orbit.target));
      orbit.target.copy(center);
      orbit.update();
    }
    const near = MathUtils.clamp(radius * 0.002, 0.0002, 0.1);
    if (camera.near !== near) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
    reportDistance(kmPerPixel(camera, height, radius, AU_PER_KPC * KM_PER_AU));
    background.current?.position.copy(camera.position);
  });

  return (
    <>
      <group ref={background}>
        <Stars radius={60} depth={45} count={1400} factor={3.5} saturation={0} fade speed={0} />
      </group>
      {overview ? (
        <>
          {localGroup.galaxies.map((item, index) => (
            <group key={item.id}>
              {item.distanceKpc > 0 && <Line points={[origin, positions[index]]} color="#b0b9d7" transparent opacity={0.25} raycast={() => {}} />}
              <group position={positions[index]}>
                <GalaxyDisk galaxy={item} compact />
                <GalacticMarker
                  name={item.name}
                  priority={item.id === galaxy.id ? 3 : 0}
                  color={item.color}
                  labelOffset={
                    item.parentGalaxyId
                      ? 0.95 + localGroup.galaxies.filter((other) => other.parentGalaxyId === item.parentGalaxyId).indexOf(item) * 1.1
                      : item.distanceKpc < 100
                        ? nearbyGalaxies.indexOf(item) * -1.1 + 0.85
                        : index % 2 === 0
                          ? 0.85
                          : -0.92
                  }
                  onSelect={() => onEnterGalaxy(item)}
                />
              </group>
            </group>
          ))}
        </>
      ) : (
        <>
          <GalaxyDisk galaxy={galaxy} compact={false} />
          {localGroup.galaxies
            .filter((item) => item.parentGalaxyId === galaxy.id)
            .map((item, index) => {
              const position = galaxyPositions.get(item.id)?.clone().sub(galaxyPosition);
              return (
                position && (
                  <group key={item.id} position={position}>
                    <GalaxyDisk galaxy={item} compact />
                    <GalacticMarker name={item.name} color={item.color} labelOffset={index ? 0.9 : -0.9} onSelect={() => onEnterGalaxy(item)} />
                  </group>
                )
              );
            })}
          {objectMarkers.map((item) => (
            <group key={item.id} position={[...item.position]}>
              <GalacticMarker name={item.name} color={item.color} labelOffset={-0.8} onSelect={() => onSelectObject(item.id)} />
            </group>
          ))}
          {systemMarkers.map((item) => (
            <group key={item.id} position={[...item.position]}>
              <GalacticMarker name={item.name} priority={item.id === focusedSystem?.id ? 3 : 0} labelOffset={0.8} onSelect={() => onSelectSystem(item.id)} />
            </group>
          ))}
        </>
      )}
      <OrbitControls
        ref={controls}
        enablePan={false}
        zoomToCursor
        minDistance={overview ? entryDistance * 0.8 : focusedSystem ? EXTERNAL_SYSTEM_ENTRY_KPC * 0.7 : Math.min(8, galaxy.modelRadiusKpc * 0.9)}
        maxDistance={overview ? groupExit * 1.14 : Math.max(exitDistance * 1.4, defaultRadius)}
        zoomSpeed={3.1}
        onStart={() => {
          start.current = controls.current?.getDistance() ?? 0;
        }}
        onEnd={() => {
          const orbit = controls.current;
          if (!orbit) return;
          const radius = orbit.getDistance();
          const direction = scratch.offset.subVectors(camera.position, orbit.target).normalize().toArray();
          const handoff = { direction, distanceAu: radius * AU_PER_KPC };
          if (overview && radius > start.current && radius >= groupExit) onExitGroup(handoff);
          else if (overview && radius < start.current && radius <= entryDistance) onEnterGalaxy(galaxy, handoff);
          else if (!overview && radius > start.current && radius >= exitDistance) onExitGalaxy(handoff);
          else if (focusedSystem && radius < start.current && radius <= EXTERNAL_SYSTEM_ENTRY_KPC) onSelectSystem(focusedSystem.id, handoff);
        }}
      />
    </>
  );
}

export default function LocalGroupScene(props: Props) {
  const { t, catalogText } = useLanguage();
  const label = props.overview ? localGroup.name : props.galaxy.name;
  return (
    <CanvasBoundary>
      <Canvas camera={CAMERA} dpr={[1, 1.5]} aria-label={t('canvas.namedModel', [catalogText(label)])}>
        <GalacticLabelLayer>
          <Scene {...props} />
        </GalacticLabelLayer>
      </Canvas>
    </CanvasBoundary>
  );
}
