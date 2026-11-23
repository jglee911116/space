'use client';

import { useLanguage } from '@/i18n/language';
import { Line, OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useMemo, useRef, useState } from 'react';
import { MathUtils, Quaternion, Vector3 } from 'three';
import type { StarSystem } from '@/constants/space';
import { KM_PER_AU, KM_PER_LIGHT_YEAR } from '@/constants/space/units';
import { kmPerPixel, type ReportDistanceScale } from '../utils/distance-scale';
import { nearbyPositions, neighborhoodOverviewDistance } from '../utils/nearby-positions';
import { GaiaPreview } from '../three/maps/gaia-preview';
import { CanvasBoundary } from '../three/shared/canvas-boundary';
import type { ZoomHandoff } from '../utils/zoom';
import { readGaiaSourceId, useGaiaSource, type GaiaNeighbor, type GaiaSource } from '../utils/gaia-catalog';
import { gaiaSourcePath } from '../utils/paths';
import { withLocale } from '@/i18n/routing';
import styles from '../explore.module.scss';

function createMarkers(systems: readonly StarSystem[]) {
  const markers = nearbyPositions(systems);
  // Lay the longest baseline across the initial view to leave room for its label.
  const reference = markers.reduce<(typeof markers)[number] | undefined>((farthest, marker) => (marker.distanceLightYears > (farthest?.distanceLightYears ?? 0) ? marker : farthest), undefined);
  const rotation = new Quaternion();
  if (reference) {
    rotation.setFromUnitVectors(reference.position.clone().normalize(), new Vector3(1, 0, 0));
    for (const { position } of markers) position.applyQuaternion(rotation);
  }
  return { markers, rotation };
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

type MapActions = {
  onSource: (source: GaiaSource | null) => void;
  onExit: (entry: ZoomHandoff) => void;
  onEnterSolar: () => void;
};

function Map({ systems, markers, rotation, focusedSource, aroundPosition, neighbors, showGaia, projectLabels, reportDistance, onSource, onExit, onEnterSolar }: ReturnType<typeof createMarkers> & MapActions & { systems: readonly StarSystem[]; focusedSource?: GaiaSource; aroundPosition?: GaiaSource['position']; neighbors?: readonly GaiaNeighbor[]; showGaia: boolean; projectLabels: ProjectLabels; reportDistance: ReportDistanceScale }) {
  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height));
  const distance = neighborhoodOverviewDistance(systems, aspect);
  const focusPosition = focusedSource?.position ?? aroundPosition;
  const center = useMemo(() => focusPosition
    ? new Vector3(...focusPosition).applyQuaternion(rotation)
    : new Vector3(), [focusPosition, rotation]);
  const camera = useThree((state) => state.camera);
  const zoomStart = useRef(0);
  const clearSource = useCallback(() => onSource(null), [onSource]);
  const projected = useMemo(() => new Vector3(), []);

  const minDistance = focusPosition ? 2 : Math.min(24, distance * 0.25);
  const maxDistance = distance * 2.4;
  const initialDistance = focusedSource ? 44 : aroundPosition ? 30 / MathUtils.clamp(aspect, 0.35, 1) : distance;
  const cameraPosition = useMemo<[number, number, number]>(() => [center.x, center.y, center.z + initialDistance], [center, initialDistance]);

  useFrame(({ camera, size, raycaster }) => {
    camera.updateMatrixWorld();
    const distanceToCenter = camera.position.distanceTo(center);
    const projection = kmPerPixel(camera, size.height, distanceToCenter, 1);
    if (raycaster.params.Points) raycaster.params.Points.threshold = 7 * projection;
    reportDistance(projection * KM_PER_LIGHT_YEAR);
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
      <PerspectiveCamera makeDefault fov={44} far={maxDistance + distance} position={cameraPosition} />
      <OrbitControls
        target={center}
        enablePan={false}
        minDistance={minDistance}
        maxDistance={maxDistance}
        onStart={() => { zoomStart.current = camera.position.distanceTo(center); }}
        onEnd={() => {
          const offset = projected.copy(camera.position).sub(center);
          const current = offset.length();
          if (current > zoomStart.current && current >= maxDistance * 0.99) {
            onExit({ direction: offset.normalize().toArray(), distanceAu: current * KM_PER_LIGHT_YEAR / KM_PER_AU });
          } else if (current < zoomStart.current && current <= minDistance * 1.01) {
            if (!focusPosition) onEnterSolar();
          }
        }}
      />
      {showGaia && !aroundPosition && <GaiaPreview center={center} rotation={rotation} overviewDistance={distance} onSelect={onSource} onExit={clearSource} />}
      {neighbors && (
        <group quaternion={rotation}>
          {neighbors.map(({ source }) => (
            <mesh key={source.id} position={source.position} onClick={(event) => {
              if (event.delta > 4) return;
              event.stopPropagation();
              onSource(source);
            }}>
              <sphereGeometry args={[0.12, 12, 8]} />
              <meshBasicMaterial color="#8ae5ff" />
            </mesh>
          ))}
        </group>
      )}
      {focusPosition && (
        <mesh position={center}>
          <sphereGeometry args={[0.19, 16, 12]} />
          <meshBasicMaterial color="#ffd6a4" />
        </mesh>
      )}
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

function GaiaSourceCard({ source, onClose, onOpenNeighbors }: { source: GaiaSource; onClose: () => void; onOpenNeighbors: () => void }) {
  const { t, locale, number } = useLanguage();
  const [copy, setCopy] = useState<'copied' | 'manual'>();
  const path = withLocale(gaiaSourcePath(source.id), locale);
  return (
    <aside className={styles.gaiaSource} aria-label={t('details.gaiaSource')}>
      <button className={styles.gaiaClose} type="button" aria-label={t('details.close')} onClick={onClose}>×</button>
      <strong>Gaia DR3 {source.id}</strong>
      <span>{t('details.gaiaSunDistance', [t('units.lightYears', [number(source.distance, 2)])])} · G {number(source.magnitude, 2)}</span>
      <a href="https://gea.esac.esa.int/archive/" target="_blank" rel="noreferrer">ESA/Gaia/DPAC</a>
      <button className={styles.gaiaCopy} type="button" onClick={onOpenNeighbors}>{t('details.gaiaAroundSource')}</button>
      <button className={styles.gaiaCopy} type="button" onClick={async () => {
        try {
          await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
          setCopy('copied');
        } catch {
          setCopy('manual');
        }
      }}>{t('details.gaiaShare')}</button>
      {copy === 'copied' && <span role="status">{t('details.gaiaCopied')}</span>}
      {copy === 'manual' && <input aria-label={t('details.gaiaShare')} readOnly value={new URL(path, window.location.origin).href} onFocus={(event) => event.currentTarget.select()} />}
    </aside>
  );
}

export default function NeighborhoodScene({ systems, onSelect, reportDistance, showGaia, onExit, sourceId, onClearSource, aroundPosition, neighbors, onOpenNeighbors }: {
  systems: readonly StarSystem[];
  onSelect: (id: string) => void;
  reportDistance: ReportDistanceScale;
  showGaia: boolean;
  onExit: MapActions['onExit'];
  sourceId: string | null;
  onClearSource: () => void;
  aroundPosition?: GaiaSource['position'];
  neighbors?: readonly GaiaNeighbor[];
  onOpenNeighbors: (id: string) => void;
}) {
  const { t, catalogText, number } = useLanguage();
  const [pickedSource, setSource] = useState<GaiaSource | null>(null);
  const lookupId = readGaiaSourceId(sourceId);
  const lookup = useGaiaSource(lookupId);
  const focusedSource = lookup?.source ?? undefined;
  const source = (showGaia || aroundPosition ? pickedSource : null) ?? focusedSource;
  const sourceStatus = sourceId && !source
    ? !lookupId || lookup?.source === null && !lookup.failed ? 'search.gaiaMissing'
      : lookup?.failed ? 'search.gaiaUnavailable' : 'search.gaiaLoading'
    : null;
  const enterSolar = useCallback(() => onSelect('solar'), [onSelect]);
  const { markers, rotation } = useMemo(() => createMarkers(systems), [systems]);
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
        <Canvas dpr={[1, 1.5]} aria-label={t('canvas.solarNeighborhood')} onPointerMissed={() => setSource(null)}>
          <Map key={focusedSource?.id ?? (aroundPosition ? 'around' : 'overview')} focusedSource={focusedSource} aroundPosition={aroundPosition} neighbors={neighbors} systems={systems} markers={markers} rotation={rotation} showGaia={showGaia} projectLabels={projectLabels} reportDistance={reportDistance} onSource={setSource} onExit={onExit} onEnterSolar={enterSolar} />
        </Canvas>
      </CanvasBoundary>
      {source && <GaiaSourceCard key={source.id} source={source} onOpenNeighbors={() => onOpenNeighbors(source.id)} onClose={() => {
        setSource(null);
        if (sourceId) onClearSource();
      }} />}
      {sourceStatus && (
        <aside className={styles.gaiaSource} aria-label={t('details.gaiaSource')}>
          <button className={styles.gaiaClose} type="button" aria-label={t('details.close')} onClick={onClearSource}>×</button>
          <span role="status">{t(sourceStatus)}</span>
        </aside>
      )}
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
