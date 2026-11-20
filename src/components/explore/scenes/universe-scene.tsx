'use client';

import { useLanguage } from '@/i18n/language';
import { Line, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type ComponentRef } from 'react';
import { AdditiveBlending, Box3, MathUtils, Vector3 } from 'three';
import { observableUniverse, distantObjects, type DistantObject, superclusters, type Supercluster } from '@/constants/space';
import { cosmologicalDistances } from '../utils/cosmology';
import { virgoCluster } from '@/constants/space/superclusters';
import { virgoMemberMarkers } from '@/constants/space/galaxies/virgo-members';
import { KM_PER_AU, KM_PER_LIGHT_YEAR } from '@/constants/space/units';
import { AccretionModel } from '../three/accretion-model';
import { CanvasBoundary } from '../three/canvas-boundary';
import { GalacticMarker } from '../three/galactic-marker';
import { kmPerPixel, type ReportDistanceScale } from '../utils/distance-scale';
import { LOCAL_GROUP_ENTRY_MILLION_LIGHT_YEARS, type ZoomHandoff } from '../utils/zoom';

type Props = {
  object?: DistantObject;
  region?: Supercluster;
  clusterView: boolean;
  onSelectCluster: () => void;
  onStepIn: (entry?: ZoomHandoff) => void;
  onStepOut: (entry: ZoomHandoff) => void;
  focus?: string;
  showCounterjet?: boolean;
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

function UniverseMap({ focus, entry, region, clusterView, reportDistance, onStepIn, onStepOut, onSelectDistantObject, onSelectGalaxy, onSelectCluster }: Props) {
  const { t } = useLanguage();
  const previousRegion = region === superclusters[0] ? undefined : region ? superclusters[0] : superclusters[1];
  const innerName = previousRegion?.name ?? t('navigation.localGroup');
  const entryLimit = previousRegion?.zoomInMly ?? LOCAL_GROUP_ENTRY_MILLION_LIGHT_YEARS;
  const gridRadius = clusterView ? 6 : (region?.gridRadiusMly ?? RADIUS);
  const markers = useMemo(
    () =>
      (clusterView ? virgoMemberMarkers : region?.markers)?.map((item) => ({
        ...item,
        position: positionAt(item.rightAscension, item.declination, item.distanceMly),
      })) ?? [],
    [clusterView, region],
  );
  const mapCenter = useMemo(() => (clusterView ? new Box3().setFromPoints(markers.map(({ position }) => position)).getCenter(new Vector3()) : ORIGIN), [clusterView, markers]);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const initialDistance = useRef(0);
  const direction = useMemo(() => new Vector3(), []);
  const camera = useThree((state) => state.camera);
  const { width, height } = useThree((state) => state.size);
  const preset = gridRadius * 2.65 * Math.max(1, height / Math.max(width, 1));
  const outerLimit = clusterView ? Math.max(24, preset * 1.3) : region ? Math.max(region.zoomOutMly, preset * 1.15) : undefined;
  useLayoutEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const distance = entry
      ? Math.min(outerLimit ? outerLimit * 0.94 : RADIUS * 4, Math.max(entryLimit * 1.12, (entry.distanceAu * KM_PER_AU) / KM_PER_MAP_UNIT))
      : Math.min(preset, outerLimit ? outerLimit * 0.94 : Infinity);
    const cameraDirection = clusterView ? new Vector3(-0.72, 0.48, 0.5).normalize() : entry ? new Vector3(...entry.direction) : VIEW;
    orbit.target.copy(mapCenter);
    camera.position.copy(mapCenter).addScaledVector(cameraDirection, distance);
    orbit.update();
  }, [camera, clusterView, entry, entryLimit, mapCenter, outerLimit, preset]);
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
      {!clusterView && <GalacticMarker name={innerName} color="#ffd195" labelOffset={-0.35} onSelect={() => onStepIn()} />}
      {markers.map(({ name, position, color, galaxyId, clusterId }, index) => (
        <group key={typeof name === 'string' ? name : name.key}>
          <Line points={[mapCenter, position]} color={color} transparent opacity={0.35} depthWrite={false} raycast={() => {}} />
          <group position={position}>
            <GalacticMarker name={name} color={color} labelOffset={index % 2 ? -0.85 : 0.95} onSelect={clusterId ? onSelectCluster : galaxyId ? () => onSelectGalaxy(galaxyId) : undefined} />
          </group>
        </group>
      ))}
      {!region &&
        landmarks.map(({ id, name, color, position }, index) => (
          <group key={id}>
            <Line points={[ORIGIN, position]} color={color} transparent opacity={id === focus ? 0.75 : 0.22} depthWrite={false} raycast={() => {}} />
            <group position={position}>
              <GalacticMarker name={name} color={color} labelOffset={0.9 + index * 0.3} onSelect={() => onSelectDistantObject(id)} />
            </group>
          </group>
        ))}
      <OrbitControls
        ref={controls}
        target={mapCenter}
        enablePan={false}
        zoomToCursor
        minDistance={clusterView ? 0.35 : entryLimit * 0.55}
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
          else if (!clusterView && radius < initialDistance.current && radius <= entryLimit && orbit.target.length() < entryLimit * 2) onStepIn(handoff);
        }}
      />
    </>
  );
}

function EarlyGalaxyModel({ color, onExit }: { color: string; onExit: () => void }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const initialDistance = useRef(0);
  const stars = useMemo(() => {
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
  }, []);

  return (
    <>
      <points rotation={[0.14, 0.28, -0.24]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stars, 3]} />
        </bufferGeometry>
        <pointsMaterial color={color} size={0.043} transparent opacity={0.38} depthWrite={false} blending={AdditiveBlending} />
      </points>
      <OrbitControls
        ref={controls}
        enablePan={false}
        zoomToCursor
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
  const position: [number, number, number] = object ? [5, 5.6, 13] : [0, 0, RADIUS * 2.65];
  return (
    <CanvasBoundary>
      <Canvas
        camera={{ position, fov: 45, near: object ? 0.04 : 0.006, far: object ? 160 : RADIUS * 10 }}
        dpr={[1, 1.5]}
        aria-label={
          object
            ? t('canvas.namedObjectModel', [catalogText(object.name)])
            : t('canvas.namedMap', [catalogText(props.clusterView ? virgoCluster.name : (props.region?.name ?? observableUniverse.name))])
        }
      >
        {object?.kind === 'quasar' ? (
          <AccretionModel object={object} showCounterjet={props.showCounterjet} onExit={exit} />
        ) : object?.kind === 'early-galaxy' ? (
          <EarlyGalaxyModel color={object.color} onExit={exit} />
        ) : (
          <UniverseMap {...props} />
        )}
      </Canvas>
    </CanvasBoundary>
  );
}
