'use client';

import { useLanguage } from '@/i18n/language';
import type { CatalogText } from '@/i18n/messages';
import { Line, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import { AdditiveBlending, Box3, MathUtils, Vector3 } from 'three';
import { LANIAKEA_REGION_ID, VIRGO_REGION_ID } from '@/constants/space/superclusters';
import { observableUniverse, distantObjects, galaxies, type DistantObject, superclusters, type Supercluster } from '@/constants/space';
import { cosmologicalDistances } from '../utils/cosmology';
import type { GalaxyAssociation } from '@/constants/space/galaxy-associations';
import { AU_PER_KPC, KM_PER_AU, KM_PER_LIGHT_YEAR } from '@/constants/space/units';
import { AccretionModel } from '../three/black-holes/accretion-model';
import { NebulaVolume } from '../three/nebulae/nebula-volume';
import { useSurfaceMap } from '../three/shared/use-surface-map';
import { CosmicMapMarkers, type CosmicMapMarker } from '../three/maps/cosmic-map-markers';
import { CanvasBoundary } from '../three/shared/canvas-boundary';
import { GalacticLabelLayer, GalacticMarker } from '../three/maps/galactic-marker';
import { kmPerPixel, type ReportDistanceScale } from '../utils/distance-scale';
import { LOCAL_GROUP_ENTRY_MILLION_LIGHT_YEARS, type ZoomHandoff } from '../utils/zoom';

type Props = {
  object?: DistantObject;
  region?: Supercluster;
  association?: GalaxyAssociation;
  onSelectCluster: (id: string) => void;
  onStepIn: (entry?: ZoomHandoff) => void;
  onStepOut: (entry: ZoomHandoff) => void;
  focus?: string;
  showCounterjet?: boolean;
  accretionPlaybackTime: RefObject<number>;
  entry?: ZoomHandoff;
  reportDistance: ReportDistanceScale;

  onSelectDistantObject: (id: string) => void;
  onSelectGalaxy: (id: string) => void;
  onExitDistantObject: (id: string) => void;
};

const KM_PER_MAP_UNIT = 1e6 * KM_PER_LIGHT_YEAR;
const RADIUS = observableUniverse.radiusMillionLightYears;
const VIEW = new Vector3(0.29, 0.39, 1).normalize();
const ORIGIN = new Vector3();
function positionAt(rightAscension: number, declination: number, distance: number) {
  const ra = MathUtils.degToRad(rightAscension);
  const dec = MathUtils.degToRad(declination);
  return new Vector3(Math.cos(dec) * Math.cos(ra), Math.sin(dec), -Math.cos(dec) * Math.sin(ra)).multiplyScalar(distance);
}

const landmarks = distantObjects.map((object) => ({
  ...object,
  position: positionAt(object.rightAscension, object.declination, cosmologicalDistances(object.redshift).comovingLightYears / 1e6),
}));

function MapMarker({
  name,
  position,
  origin,
  color,
  opacity,
  offset,
  priority,
  onSelect,
}: {
  name: CatalogText;
  position: Vector3;
  origin: Vector3;
  color: string;
  opacity: number;
  offset: number;
  priority: number;
  onSelect?: () => void;
}) {
  const guide = useRef<ComponentRef<typeof Line>>(null);

  return (
    <>
      <Line ref={guide} visible={false} points={[origin, position]} color={color} transparent opacity={opacity} depthWrite={false} raycast={() => {}} />
      <group position={position}>
        <GalacticMarker name={name} priority={priority} color={color} labelOffset={offset} onSelect={onSelect} guide={guide} />
      </group>
    </>
  );
}

function UniverseMap({ focus, entry, region, association, reportDistance, onStepIn, onStepOut, onSelectDistantObject, onSelectGalaxy, onSelectCluster, accretionPlaybackTime }: Props) {
  const { t } = useLanguage();
  const previousRegionId = region?.id === VIRGO_REGION_ID ? undefined : region ? VIRGO_REGION_ID : LANIAKEA_REGION_ID;
  const previousRegion = superclusters.find(({ id }) => id === previousRegionId);
  const innerName = previousRegion?.name ?? t('navigation.localGroup');
  const entryLimit = previousRegion?.zoomInMly ?? LOCAL_GROUP_ENTRY_MILLION_LIGHT_YEARS;
  const gridRadius = association?.gridRadiusMly ?? region?.gridRadiusMly ?? RADIUS;
  const markers = useMemo(() => {
    if (association) {
      return association.members.flatMap(({ id, name, skyPosition, distanceKpc, color }) =>
        skyPosition
          ? [
              {
                name,
                color,
                galaxyId: id,
                clusterId: undefined,
                position: positionAt(skyPosition.rightAscension, skyPosition.declination, (distanceKpc * AU_PER_KPC * KM_PER_AU) / KM_PER_MAP_UNIT),
              },
            ]
          : [],
      );
    }
    return (
      region?.markers.map((item) => ({
        ...item,
        position: positionAt(item.rightAscension, item.declination, item.distanceMly),
      })) ?? []
    );
  }, [association, region]);
  const bodies = useMemo(() => {
    const result: CosmicMapMarker[] = markers.map(({ galaxyId, position, color }) => {
      const morphology = galaxies.find((galaxy) => galaxy.id === galaxyId)?.morphology;
      return {
        position,
        color,
        style: !galaxyId ? 'cluster' : morphology?.includes('elliptical') ? 'elliptical' : morphology?.includes('irregular') ? 'irregular' : 'spiral',
      };
    });
    if (!association) result.push({ position: ORIGIN, color: '#ffd195', style: 'cluster' });
    if (!region) {
      for (const object of landmarks) {
        const style = object.kind === 'ring-galaxy' ? 'ring' : object.kind === 'early-galaxy' ? 'irregular' : object.visibleJet ? 'jet' : 'quasar';
        result.push({ position: object.position, color: object.color, style });
      }
    }
    return result;
  }, [association, markers, region]);
  const mapCenter = useMemo(() => (association ? new Box3().setFromPoints(markers.map(({ position }) => position)).getCenter(new Vector3()) : ORIGIN), [association, markers]);
  const focusedLandmark = !region && !association ? landmarks.find(({ id }) => id === focus) : undefined;
  const orbitTarget = focusedLandmark?.position ?? mapCenter;
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const initialDistance = useRef(0);
  const direction = useMemo(() => new Vector3(), []);
  const camera = useThree((state) => state.camera);
  const { width, height } = useThree((state) => state.size);
  const preset = gridRadius * 2.65 * Math.max(1, height / Math.max(width, 1));
  const landmarkReturnDistance = preset * 0.38;
  const outerLimit = association ? Math.max(gridRadius * 4, preset * 1.3) : region ? Math.max(region.zoomOutMly, preset * 1.15) : undefined;
  useLayoutEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const distance = entry
      ? Math.min(outerLimit ? outerLimit * 0.94 : RADIUS * 4, Math.max(entryLimit * 1.12, (entry.distanceAu * KM_PER_AU) / KM_PER_MAP_UNIT))
      : focusedLandmark ? landmarkReturnDistance : Math.min(preset, outerLimit ? outerLimit * 0.94 : Infinity);
    const cameraDirection = association ? new Vector3(-0.72, 0.48, 0.5).normalize() : entry ? new Vector3(...entry.direction) : VIEW;
    orbit.target.copy(orbitTarget);
    camera.position.copy(orbitTarget).addScaledVector(cameraDirection, distance);
    orbit.update();
  }, [camera, association, entry, entryLimit, focusedLandmark, landmarkReturnDistance, orbitTarget, outerLimit, preset]);
  const grid = useMemo(
    () =>
      Array.from({ length: 129 }, (_, index) => {
        const angle = (index * Math.PI) / 64;
        return new Vector3(Math.cos(angle), 0, Math.sin(angle));
      }),
    [],
  );
  useFrame(({ camera, size }) => {
    const orbit = controls.current;
    if (!orbit) return;
    const radius = orbit.getDistance();
    orbit.zoomSpeed = 2.5 + 4 * MathUtils.smoothstep(Math.log(radius), Math.log(14), Math.log(600));
    const near = Math.max(0.006, radius * 0.001);
    if (camera.near !== near) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
    reportDistance(kmPerPixel(camera, size.height, radius, KM_PER_MAP_UNIT));
  });

  return (
    <>
      {[0.25, 0.5, 0.75, 1].map((ratio) => (
        <group key={ratio} position={mapCenter} scale={gridRadius * ratio}>
          <Line points={grid} color="#859ad8" transparent opacity={ratio === 1 ? 0.46 : 0.16} depthWrite={false} raycast={() => {}} />
          {!region && ratio === 1 && (
            <>
              <Line points={grid} rotation-x={Math.PI / 2} color="#859ad8" transparent opacity={0.24} depthWrite={false} raycast={() => {}} />
              <Line points={grid} rotation-z={Math.PI / 2} color="#859ad8" transparent opacity={0.24} depthWrite={false} raycast={() => {}} />
            </>
          )}
        </group>
      ))}
      <CosmicMapMarkers markers={bodies} referenceDepth={preset} accretionTime={region ? undefined : accretionPlaybackTime} />
      {!association && <GalacticMarker name={innerName} priority={2} color="#ffd195" labelOffset={-0.92} onSelect={() => onStepIn()} />}
      {markers.map(({ name, position, color, galaxyId, clusterId }, index) => (
        <MapMarker
          key={typeof name === 'string' ? name : name.key}
          name={name}
          position={position}
          origin={mapCenter}
          color={color}
          opacity={0.35}
          offset={index % 2 ? -0.85 : 0.95}
          priority={clusterId ? 2 : 0}
          onSelect={clusterId ? () => onSelectCluster(clusterId) : galaxyId ? () => onSelectGalaxy(galaxyId) : undefined}
        />
      ))}
      {!region &&
        landmarks.map(({ id, name, color, position }, index) => (
          <MapMarker
            key={id}
            name={name}
            position={position}
            origin={ORIGIN}
            color={color}
            opacity={id === focus ? 0.75 : 0.22}
            offset={index % 2 ? -0.85 : 0.95}
            priority={id === focus ? 3 : 0}
            onSelect={() => onSelectDistantObject(id)}
          />
        ))}
      <OrbitControls
        ref={controls}
        target={orbitTarget}
        enablePan={false}
        minDistance={association ? gridRadius * 0.06 : entryLimit * 0.55}
        maxDistance={outerLimit ? outerLimit * 1.16 : RADIUS * Math.max(7, (3 * height) / Math.max(width, 1))}
        onStart={() => {
          initialDistance.current = controls.current?.getDistance() ?? 0;
        }}
        onEnd={() => {
          const orbit = controls.current;
          if (!orbit) return;
          const radius = orbit.getDistance();
          const handoff = {
            distanceAu: (radius * KM_PER_MAP_UNIT) / KM_PER_AU,
            direction: direction.subVectors(orbit.object.position, orbit.target).normalize().toArray(),
          };
          if (outerLimit && radius > initialDistance.current && radius >= outerLimit) onStepOut(handoff);
          else if (focusedLandmark && radius < initialDistance.current && radius <= landmarkReturnDistance * 0.50) onSelectDistantObject(focusedLandmark.id);
          else if (!association && radius < initialDistance.current && radius <= entryLimit && orbit.target.length() < entryLimit * 2) onStepIn(handoff);
        }}
      />
    </>
  );
}

function DistantGalaxyModel({ object, onExit }: { object: Exclude<DistantObject, { kind: 'quasar' }>; onExit: () => void }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const initialDistance = useRef(0);
  const ringGalaxy = object.kind === 'ring-galaxy';
  const texture = useSurfaceMap(ringGalaxy ? object.observationImage : undefined);
  const stars = useMemo(() => {
    if (ringGalaxy) return undefined;
    const count = 4000;
    const positions = new Float32Array(count * 3);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const height = 1 - (2 * (i + 0.5)) / count;
      const angle = i * goldenAngle;
      const radius = 4 * ((((i * 1543) % count) + 0.5) / count) ** 1.7;
      const horizontal = radius * Math.sqrt(1 - height ** 2);
      positions.set([horizontal * Math.cos(angle), radius * height * 0.58, horizontal * Math.sin(angle) * 0.76], i * 3);
    }
    return positions;
  }, [ringGalaxy]);

  return (
    <>
      {stars ? (
        <points rotation={[0.14, 0.28, -0.24]}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[stars, 3]} />
          </bufferGeometry>
          <pointsMaterial color={object.color} size={0.043} transparent opacity={0.38} depthWrite={false} blending={AdditiveBlending} />
        </points>
      ) : <NebulaVolume texture={texture} radius={5.6} shape="cartwheel" />}
      <OrbitControls
        ref={controls}
        enablePan={false}
        minDistance={3.8}
        maxDistance={30}
        onStart={() => {
          initialDistance.current = controls.current?.getDistance() ?? 0;
        }}
        onEnd={() => {
          const distance = controls.current?.getDistance() ?? 0;
          if (distance > initialDistance.current && distance >= 25) onExit();
        }}
      />
    </>
  );
}

export default function UniverseScene(props: Props) {
  const { t, catalogText } = useLanguage();
  const { object, onExitDistantObject } = props;
  const exit = () => {
    if (object) onExitDistantObject(object.id);
  };
  const position: [number, number, number] = object?.kind === 'ring-galaxy'
    ? [1.7, 1.0, 14.6]
    : object ? [5, 5.6, 13] : [0, 0, RADIUS * 2.65];
  return (
    <CanvasBoundary>
      <Canvas
        camera={{ position, fov: 45, near: object ? 0.04 : 0.006, far: object ? 160 : RADIUS * 10 }}
        dpr={[1, 1.5]}
        aria-label={object ? t('canvas.namedObjectModel', [catalogText(object.name)]) : t('canvas.namedMap', [catalogText(props.association?.name ?? props.region?.name ?? observableUniverse.name)])}
      >
        {object?.kind === 'quasar' ? (
          <AccretionModel object={object} showCounterjet={props.showCounterjet} onExit={exit} time={props.accretionPlaybackTime} />
        ) : object ? (
          <DistantGalaxyModel object={object} onExit={exit} />
        ) : (
          <GalacticLabelLayer>
            <UniverseMap {...props} />
          </GalacticLabelLayer>
        )}
      </Canvas>
    </CanvasBoundary>
  );
}
