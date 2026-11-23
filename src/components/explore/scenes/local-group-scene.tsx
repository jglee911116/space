'use client';

import type { CatalogText } from '@/i18n/messages';
import { useLanguage } from '@/i18n/language';
import { OrbitControls, Stars } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import { AdditiveBlending, Box3, MathUtils, NormalBlending, Quaternion, Vector3, type Group, type Points, type PointsMaterial } from 'three';
import { localGroup, type FeaturedObject, type Galaxy } from '@/constants/space';
import { AU_PER_KPC, KM_PER_KPC, LIGHT_YEARS_PER_KPC } from '@/constants/space/units';
import { useCursorZoom } from '../three/shared/use-cursor-zoom';
import { CanvasBoundary } from '../three/shared/canvas-boundary';
import { GalaxyObservationDisk } from '../three/galaxies/galaxy-observation-disk';
import { galaxyObservationPoints } from '../three/galaxies/galaxy-observation-points';
import { useSurfaceMap } from '../three/shared/use-surface-map';
import { GalaxyPreview } from '../three/galaxies/galaxy-preview';
import { galaxyParticles } from '../three/galaxies/galaxy-structure';
import { ProceduralGalaxy } from '../three/galaxies/procedural-galaxy';
import { RamPressureTail } from '../three/galaxies/ram-pressure-tail';
import { FeaturedObjectPreview } from '../three/maps/featured-object-preview';
import { LensedStarfield } from '../three/black-holes/black-hole-lensing';
import { pointBudget, projectedDiameter, updatePointDetail } from '../three/maps/map-detail';
import { GalacticLabelLayer, GalacticMarker } from '../three/maps/galactic-marker';
import { DistanceRings } from '../three/maps/distance-rings';
import { kmPerPixel, type ReportDistanceScale } from '../utils/distance-scale';
import {
  ACCRETION_MODEL_EINSTEIN_RADIUS,
  ACCRETION_MODEL_EXIT_DISTANCE,
  EXTERNAL_SYSTEM_ENTRY_KPC,
  EXTERNAL_SYSTEM_RETURN_KPC,
  GALAXY_ENTRY_KPC,
  GALAXY_EXIT_KPC,
  LOCAL_GROUP_EXIT_KPC,
  featuredOverviewDistanceKpc,
  type ZoomHandoff,
} from '../utils/zoom';

type Props = {
  systemMarkers: readonly { id: string; name: CatalogText; position: readonly [number, number, number] }[];
  objectMarkers: readonly { object: FeaturedObject; position: readonly [number, number, number] }[];
  accretionPlaybackTime: RefObject<number>;
  onSelectObject: (id: string) => void;
  onSelectSystem: (id: string, entry?: ZoomHandoff) => void;
  focusId?: string;
  overview: boolean;
  centerOnGalaxy: boolean;
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
const dwarfs = new Set(localGroup.dwarfs);
const GROUP_CENTER = new Box3().setFromPoints(positions).getCenter(new Vector3());
const VIEW = new Vector3(0, 0.48, 1).normalize();
const CAMERA = { position: [0, 0, 115] as [number, number, number], fov: 45, near: 0.1, far: 10_000 };

// 화면이 세로로 길수록 더 멀리서 시작해 은하군이 잘리지 않게 한다.
function defaultRadiusFor(overview: boolean | undefined, galaxy: Galaxy, width: number, height: number) {
  return (overview ? 1250 : Math.min(112, galaxy.modelRadiusKpc * 3.8)) * Math.max(1, (0.86 * height) / Math.max(1, width));
}
const groupExitFor = (defaultRadius: number) => Math.max(LOCAL_GROUP_EXIT_KPC, defaultRadius * 1.28);

function GalaxyDisk({ galaxy, compact }: { galaxy: Galaxy; compact: boolean }) {
  const observation = galaxy.diskObservation;
  const diffuse = !observation && galaxy.morphology?.includes('irregular');
  const texture = useSurfaceMap(compact ? observation?.previewFile : observation?.file);
  const points = useMemo(() => {
    if (texture && observation) return galaxyObservationPoints(texture, observation, galaxy.modelRadiusKpc, compact ? 1400 : 12_000);
    return galaxyParticles(galaxy, compact ? 1400 : 24_000);
  }, [texture, observation, galaxy, compact]);
  const disk = useRef<Points>(null);
  const position = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    const pointCloud = disk.current;
    if (!pointCloud) return;
    if (!compact) {
      updatePointDetail(pointCloud, position, camera, size.height, galaxy.modelRadiusKpc);
      return;
    }

    const diameter = projectedDiameter(pointCloud, position, camera, size.height, galaxy.modelRadiusKpc);
    const opacity = MathUtils.smoothstep(diameter, 12, 52) * (observation ? (texture ? 0.38 : 0.46) : 0.34);
    (pointCloud.material as PointsMaterial).opacity = opacity;
    pointCloud.visible = opacity > 0.005;
    const count = pointBudget(pointCloud.geometry.attributes.position.count, diameter);
    if (pointCloud.geometry.drawRange.count !== count) pointCloud.geometry.setDrawRange(0, count);
  });
  return (
    <group rotation-x={galaxy.diskTilt ?? 0}>
      {(!observation || (!compact && observation.blendProcedural)) && <ProceduralGalaxy galaxy={galaxy} compact={compact} opacity={texture ? 0.48 : 1} blendObservation={!!texture} />}
      {!compact && galaxy.ramPressureTail && <RamPressureTail radius={galaxy.modelRadiusKpc} twin={!!galaxy.ramPressureTail.twin} />}
      {observation && compact && <GalaxyPreview galaxy={galaxy} texture={texture} />}
      {!compact && texture && observation && (
        <GalaxyObservationDisk texture={texture} radius={galaxy.modelRadiusKpc} center={observation.center} span={observation.span} rotation={observation.rotation} />
      )}
      {points && (
        <points ref={disk} raycast={() => {}}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[points.positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[points.colors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            vertexColors
            size={compact ? 1.25 : 1.2}
            sizeAttenuation={false}
            transparent
            opacity={compact ? 0 : diffuse ? 0.33 : 0.45}
            blending={diffuse ? AdditiveBlending : NormalBlending}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
}

function Scene({
  overview,
  centerOnGalaxy,
  galaxy,
  entry,
  reportDistance,
  onEnterGalaxy,
  onExitGalaxy,
  onExitGroup,
  systemMarkers,
  objectMarkers,
  accretionPlaybackTime,
  onSelectObject,
  onSelectSystem,
  focusId,
}: Props) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const cursorZoomRef = useCursorZoom();
  const background = useRef<Group>(null);
  const start = useRef(0);
  const camera = useThree((state) => state.camera);
  const { width, height } = useThree((state) => state.size);
  const getState = useThree((state) => state.get);
  const scratch = useMemo(() => ({ aim: new Vector3(), offset: new Vector3() }), []);
  const focusedObject = !overview ? objectMarkers.find(({ object }) => object.id === focusId) : undefined;
  const objectDistance = focusedObject ? featuredOverviewDistanceKpc(focusedObject.object) : 0;
  const lensFade = useMemo(() => [objectDistance * 1.25, objectDistance * 6] as const, [objectDistance]);
  const focusedSystem = !overview && !focusedObject ? (systemMarkers.find(({ id }) => id === focusId) ?? systemMarkers[0]) : undefined;
  const focusPosition = focusedSystem?.position;
  const galaxyPosition = galaxyPositions.get(galaxy.id) ?? origin;
  // Small galaxies should open at a scale where their structure is already visible.
  const exitDistance = Math.min(GALAXY_EXIT_KPC, Math.max(24, galaxy.modelRadiusKpc * 8.5));
  const entryDistance = exitDistance * (GALAXY_ENTRY_KPC / GALAXY_EXIT_KPC);
  const defaultRadius = defaultRadiusFor(overview, galaxy, width, height);
  const groupExit = groupExitFor(defaultRadius);
  const overviewTarget = centerOnGalaxy ? galaxyPosition : GROUP_CENTER;

  useLayoutEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    // 창 크기 변경으로는 다시 실행하지 않도록 크기는 실행 시점 값만 읽는다.
    const { width, height } = getState().size;
    const defaultRadius = defaultRadiusFor(overview, galaxy, width, height);
    const groupExit = groupExitFor(defaultRadius);
    cursorZoomRef.current = false;
    const returnFromSystem = entry && !overview && focusId && focusPosition;
    const entryLimit = overview ? groupExit * 0.95 : defaultRadius;
    const distance = focusedObject
      ? entry
        ? entry.distanceAu / AU_PER_KPC
        : objectDistance
      : returnFromSystem
        ? EXTERNAL_SYSTEM_RETURN_KPC
        : entry
          ? Math.min(entryLimit, entry.distanceAu / AU_PER_KPC)
          : defaultRadius;
    orbit.target.copy(overview ? overviewTarget : origin);
    if (returnFromSystem) orbit.target.set(...focusPosition);
    if (focusedObject) orbit.target.set(...focusedObject.position);
    const direction = entry ? scratch.offset.set(...entry.direction) : VIEW;
    camera.position.copy(orbit.target).addScaledVector(direction, distance);
    orbit.update();
  }, [camera, cursorZoomRef, entry, focusId, focusPosition, focusedObject, galaxy, getState, objectDistance, overview, overviewTarget, scratch]);

  useFrame(({ camera }) => {
    const orbit = controls.current;
    if (!orbit) return;
    const radius = orbit.getDistance();
    if (!cursorZoomRef.current && overview && !centerOnGalaxy) {
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
    const near = MathUtils.clamp(radius * 0.002, 0.00002, 0.1);
    if (camera.near !== near) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
    reportDistance(kmPerPixel(camera, height, radius, KM_PER_KPC));
    background.current?.position.copy(camera.position);
  });

  return (
    <>
      {focusedObject?.object.kind === 'black-hole' && (
        <LensedStarfield center={focusedObject.position} einsteinRadius={(objectDistance * ACCRETION_MODEL_EINSTEIN_RADIUS) / ACCRETION_MODEL_EXIT_DISTANCE} fadeRange={lensFade} />
      )}
      <group ref={background}>
        <Stars radius={60} depth={45} count={1400} factor={3.5} saturation={0} fade speed={0} />
      </group>
      {overview ? (
        <>
          <DistanceRings outerRadius={1000} lightYearsPerUnit={LIGHT_YEARS_PER_KPC} />
          {localGroup.galaxies.map((item, index) => {
            const dwarf = dwarfs.has(item);
            const select = () => onEnterGalaxy(item);
            const staggeredOffset = index % 2 === 0 ? 0.85 : -0.92;
            const labelOffset = dwarf
              ? staggeredOffset
              : item.parentGalaxyId
                ? 0.95 + localGroup.galaxies.filter((other) => other.parentGalaxyId === item.parentGalaxyId).indexOf(item) * 1.1
                : item.distanceKpc < 100
                  ? nearbyGalaxies.indexOf(item) * -1.1 + 0.85
                  : staggeredOffset;
            return (
              <group key={item.id} position={positions[index]}>
                {dwarf ? <GalaxyPreview galaxy={item} radius={Math.max(7, item.modelRadiusKpc)} onSelect={select} /> : <GalaxyDisk galaxy={item} compact />}
                <GalacticMarker name={item.name} priority={item.id === galaxy.id ? 3 : dwarf ? 0 : 1} color={item.color} labelOffset={labelOffset} onSelect={select} />
              </group>
            );
          })}
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
          {objectMarkers.map(({ object, position }) => (
            <group key={object.id} position={[...position]}>
              {(object.extentLightYears > 0 || object.photosphere || object.id === focusId) && (
                <FeaturedObjectPreview object={object} focused={object.id === focusId} playbackTime={object.kind === 'black-hole' ? accretionPlaybackTime : undefined} />
              )}
              <GalacticMarker
                name={object.name}
                color={object.color}
                labelOffset={-1.0}
                modelRadius={object.id === focusId ? objectDistance * 0.13 : undefined}
                priority={object.id === focusId ? 3 : 0}
                onSelect={() => onSelectObject(object.id)}
              />
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
        minDistance={overview ? entryDistance * 0.8 : focusedObject ? objectDistance * 0.55 : focusedSystem ? EXTERNAL_SYSTEM_ENTRY_KPC * 0.7 : Math.min(8, galaxy.modelRadiusKpc * 0.9)}
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
          else if (focusedObject && radius < start.current && radius <= objectDistance * 0.72) onSelectObject(focusedObject.object.id);
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
