'use client';

import { useLanguage } from '@/i18n/language';
import { Line, OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useMemo, useRef } from 'react';
import { MathUtils, Quaternion, Vector3 } from 'three';
import type { StarSystem } from '@/constants/space';
import { KM_PER_LIGHT_YEAR } from '@/constants/space/units';
import { kmPerPixel, type ReportDistanceScale } from '../utils/distance-scale';
import { nearbyPositions } from '../utils/nearby-positions';
import { CanvasBoundary } from '../three/canvas-boundary';
import styles from '../explore.module.scss';

function createMarkers(systems: readonly StarSystem[]) {
  const markers = nearbyPositions(systems);
  // Lay the longest baseline across the initial view to leave room for its label.
  const reference = markers.reduce<(typeof markers)[number] | undefined>((farthest, marker) => (marker.distanceLightYears > (farthest?.distanceLightYears ?? 0) ? marker : farthest), undefined);
  if (reference) {
    const rotation = new Quaternion().setFromUnitVectors(reference.position.clone().normalize(), new Vector3(1, 0, 0));
    for (const { position } of markers) position.applyQuaternion(rotation);
  }
  return markers;
}

type ProjectedMarker = { id: string; x: number; y: number; visible: boolean };
type ProjectLabels = (markers: readonly ProjectedMarker[], width: number, height: number) => void;

const LABEL_OFFSETS = [
  [0, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [1, -1],
  [-1, -1],
  [1, 1],
  [-1, 1],
  [0, -2],
  [0, 2],
  [1, -2],
  [-1, -2],
  [1, 2],
  [-1, 2],
  [2, 0],
  [-2, 0],
  [0, -3],
  [0, 3],
];

function Map({ markers, projectLabels, reportDistance }: { markers: ReturnType<typeof createMarkers>; projectLabels: ProjectLabels; reportDistance: ReportDistanceScale }) {
  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height));
  const { center, radius } = useMemo(() => {
    const center = markers.reduce((sum, { position }) => sum.add(position), new Vector3()).divideScalar(Math.max(1, markers.length));
    return { center, radius: Math.max(1, ...markers.map(({ position }) => position.distanceTo(center))) };
  }, [markers]);
  const projected = useMemo(() => new Vector3(), []);
  const distance = (radius * 3.65) / Math.min(1, Math.max(0.35, aspect));

  useFrame(({ camera, size }) => {
    camera.updateMatrixWorld();
    reportDistance(kmPerPixel(camera, size.height, camera.position.distanceTo(center), KM_PER_LIGHT_YEAR));
    const screenMarkers = markers.map(({ system, position }) => {
      projected.copy(position).project(camera);
      return {
        id: system.id,
        x: (projected.x + 1) * size.width * 0.5,
        y: (1 - projected.y) * size.height * 0.5,
        visible: Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1 && Math.abs(projected.z) <= 1,
      };
    });
    projectLabels(screenMarkers, size.width, size.height);
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={44} position={[center.x, center.y, center.z + distance]} />
      <OrbitControls target={center} enablePan={false} minDistance={radius * 2.6} maxDistance={radius * 16} />
      <Stars radius={100} depth={50} count={1800} factor={6} saturation={0} fade speed={0} />
      {markers.map(({ system, distanceLightYears, position }) => (
        <group key={system.id}>
          {distanceLightYears > 0 && <Line points={[[0, 0, 0], position]} color="#a8c3e3" transparent opacity={0.42} lineWidth={1} />}
          <mesh position={position}>
            <sphereGeometry args={[0.09, 24, 16]} />
            <meshBasicMaterial color={system.bodies[0].colors[2]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export default function NeighborhoodScene({ systems, onSelect, reportDistance }: { systems: readonly StarSystem[]; onSelect: (id: string) => void; reportDistance: ReportDistanceScale }) {
  const { t, catalogText, number } = useLanguage();
  const markers = useMemo(() => createMarkers(systems), [systems]);
  const labels = useRef<Record<string, HTMLDivElement>>({});
  const projectLabels = useCallback<ProjectLabels>((screenMarkers, width, height) => {
    const entries = screenMarkers.flatMap((marker) => {
      const label = labels.current[marker.id];
      const button = label?.firstElementChild;
      return label && button instanceof HTMLButtonElement ? [{ ...marker, label, halfWidth: button.offsetWidth / 2, halfHeight: button.offsetHeight / 2 }] : [];
    });
    const occupied: { x: number; y: number; halfWidth: number; halfHeight: number }[] = [];
    for (const { x, y, visible, label, halfWidth, halfHeight } of entries) {
      label.style.visibility = 'hidden';
      if (!visible) continue;
      const position = LABEL_OFFSETS.map(([dx, dy]) => ({
        x: MathUtils.clamp(x + dx * (halfWidth + 14), halfWidth + 8, width - halfWidth - 8),
        y: MathUtils.clamp(y + dy * (halfHeight + 20), Math.min(height / 3, 108) + halfHeight, height - halfHeight - 16),
      })).find((candidate) => occupied.every((other) => Math.abs(candidate.x - other.x) >= halfWidth + other.halfWidth + 8 || Math.abs(candidate.y - other.y) >= halfHeight + other.halfHeight + 8));
      if (!position) continue;
      const dx = position.x - x;
      const dy = position.y - y;
      occupied.push({ ...position, halfWidth, halfHeight });
      label.style.visibility = 'visible';
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
      label.style.setProperty('--label-x', `${dx}px`);
      label.style.setProperty('--label-y', `${dy}px`);
      label.style.setProperty('--label-angle', `${Math.atan2(dy, dx)}rad`);
      label.style.setProperty('--label-distance', `${Math.hypot(dx, dy)}px`);
    }
  }, []);
  return (
    <>
      <CanvasBoundary>
        <Canvas aria-label={t('canvas.solarNeighborhood')}>
          <Map markers={markers} projectLabels={projectLabels} reportDistance={reportDistance} />
        </Canvas>
      </CanvasBoundary>
      <div className={styles.nearbyLabels}>
        {markers.map(({ system, distanceLightYears }) => (
          <div
            key={system.id}
            ref={(label) => {
              if (label) labels.current[system.id] = label;
              else delete labels.current[system.id];
            }}
            className={styles.nearbyAnchor}
          >
            <button className={styles.nearbyMarker} type="button" onClick={() => onSelect(system.id)}>
              <strong>{catalogText(system.name)}</strong>
              <span>{distanceLightYears === 0 ? t('navigation.distanceReference') : t('units.lightYears', [number(distanceLightYears, 2)])}</span>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
