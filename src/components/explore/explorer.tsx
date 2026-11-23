'use client';

import { Message, useLanguage } from '@/i18n/language';
import dynamic from 'next/dynamic';
import { withLocale, withoutLocale } from '@/i18n/routing';
import type { Locale } from '@/i18n/messages';
import { CatalogSearch } from './catalog-search';
import { LanguageSelect } from './language-select';
import { usePathname, useSearchParams } from 'next/navigation';
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { galaxyAssociations, superclusters, observableUniverse, distantObjects, featuredObjects, galaxies, localGroup, milkyWay, systems, type Galaxy, type StarSystem } from '@/constants/space';
import { gaiaCounterpartsBySource, gaiaCounterpartsForSystem } from './utils/gaia-counterparts';
import { gaiaNeighborRadii, gaiaSampleRadiusLightYears, readGaiaNeighborRadius, readGaiaSourceId, useGaiaNeighbors, useGaiaSource, type GaiaNeighborRadius } from './utils/gaia-catalog';
import { nearbyPositions, featuredGalaxyPosition } from './utils/nearby-positions';
import { SITE_NAME_KEY } from '@/constants/site';
import {
  BlackHoleDetails,
  BodyDetails,
  BodyTooltip,
  ComparisonDistance,
  GalaxyDetails,
  isMultiStar,
  OortCloudDetails,
  OuterRegionDetails,
  SystemDetails,
  LocalGroupDetails,
  GalaxySummaryDetails,
  FeaturedObjectDetails,
  UniverseDetails,
  SuperclusterDetails,
  NeighborhoodDetails,
} from './details';
import { isNearbySystem } from './utils/nearby-positions';
import { distanceScale } from './utils/distance-scale';
import { createDistanceStore } from './utils/distance-store';
import { gaiaSourcePath, galaxyFocusPath, readExplorerQuery, universeFocusPath, updateSystemLocation, associationPath, distantObjectPath, featuredObjectPath, galaxyPath, HOME_PATH, LOCAL_GROUP_PATH, localGroupPath, superclusterPath, systemPath, UNIVERSE_PATH } from './utils/paths';
import { elapsedSimulationDays, REALTIME_DAYS_PER_SECOND } from './utils/orbit';
import type { Overview, Target } from './scenes/system-scene';
import { AU_PER_KPC } from '@/constants/space/units';
import type { ClusterLayer } from '@/constants/space';
import { featuredOverviewDistanceKpc, type ZoomHandoff, type ZoomScale } from './utils/zoom';
import styles from './explore.module.scss';

const SystemScene = memo(
  dynamic(() => import('./scenes/system-scene'), {
    ssr: false,
    loading: () => (
      <p className={styles.status} role="status">
        <Message id={'canvas.loadingScene'} />
      </p>
    ),
  }),
);

const GalaxyScene = memo(
  dynamic(() => import('./scenes/galaxy-scene'), {
    ssr: false,
    loading: () => (
      <p className={styles.status} role="status">
        <Message id={'canvas.loadingMilkyWay'} />
      </p>
    ),
  }),
);

const NeighborhoodScene = memo(
  dynamic(() => import('./scenes/neighborhood-scene'), {
    ssr: false,
    loading: () => (
      <p className={styles.status} role="status">
        <Message id={'canvas.loadingDistanceMap'} />
      </p>
    ),
  }),
);

const LocalGroupScene = dynamic(() => import('./scenes/local-group-scene'), {
  ssr: false,
  loading: () => (
    <p className={styles.status} role="status">
      <Message id={'canvas.loadingGalaxy'} />
    </p>
  ),
});

const FeaturedObjectScene = dynamic(() => import('./scenes/featured-object-scene'), {
  ssr: false,
  loading: () => (
    <p className={styles.status} role="status">
      <Message id={'canvas.loadingObject'} />
    </p>
  ),
});

const UniverseScene = dynamic(() => import('./scenes/universe-scene'), {
  ssr: false,
  loading: () => (
    <p className={styles.status} role="status">
      <Message id={'canvas.loadingUniverseMap'} />
    </p>
  ),
});

type ExplorerView = Overview | 'galaxy' | 'neighborhood';
const DEFAULT_SYSTEM_ID = systems[0].id;
const gaiaSystemCenters = new Map(nearbyPositions(systems.filter((system) => (system.galaxyId ?? milkyWay.id) === milkyWay.id))
  .map(({ system, position }) => [system.id, { name: system.name, position: position.toArray() }]));
type HoveredBody = { id: string; x: number; y: number };

function recordView(locale: Locale, target: Target, overview: ExplorerView, systemId: string, defaultSystemId: string, galaxyId: string) {
  const url = new URL(window.location.href);
  const path = withLocale(overview === 'neighborhood' ? HOME_PATH : galaxyPath(galaxyId), locale);
  const systemParam = overview === 'neighborhood' || (systemId === defaultSystemId && (overview || target)) ? null : systemId;
  if (!updateSystemLocation(url, path, systemParam, target, overview)) return false;

  window.history.pushState(null, '', url);
  return true;
}

const infoMediaQuery = '(max-width: 560px)';

function subscribeToInfoMedia(change: () => void) {
  const media = window.matchMedia(infoMediaQuery);
  media.addEventListener('change', change);
  return () => media.removeEventListener('change', change);
}

export function Explorer() {
  const { t, catalogText, locale, number, measurement } = useLanguage();
  const pathname = withoutLocale(usePathname());
  const searchParams = useSearchParams();
  const { system: systemParam, target: targetParam, view: viewParam, focus, galaxy: galaxyParam, cluster: clusterParam, gaia: gaiaParam, around: aroundParam, radius: radiusParam } = readExplorerQuery(searchParams);
  const universeView = pathname === UNIVERSE_PATH;
  const region = superclusters.find(({ id }) => pathname === superclusterPath(id));
  const cosmicView = universeView || !!region;
  const association = viewParam === 'cluster' ? galaxyAssociations.find((item) => item.mapRegionId === region?.id && item.id === clusterParam) : undefined;
  const distantObject = universeView ? distantObjects.find(({ id }) => id === targetParam) : undefined;
  const infoId = useId();
  const infoButton = useRef<HTMLButtonElement>(null);
  const compactInfo = useSyncExternalStore(subscribeToInfoMedia, () => window.matchMedia(infoMediaQuery).matches, () => false);
  // 정보 패널 열림/닫힘 선택은 지금 보는 화면에만 적용한다(이동하거나 뒤로 가면 기본값으로).
  const viewKey = `${pathname}?${searchParams}`;
  const [infoChoice, setInfoChoice] = useState<{ viewKey: string; open: boolean }>();
  const infoPreference = infoChoice?.viewKey === viewKey ? infoChoice.open : undefined;
  const setInfoPreference = (open: boolean) => setInfoChoice({ viewKey, open });
  const neighborsByDefault = viewParam === 'neighborhood' && !!aroundParam;
  const infoOpen = infoPreference ?? (neighborsByDefault || !compactInfo);
  const closeInfo = () => {
    setInfoPreference(false);
    infoButton.current?.focus();
  };
  const [showGaia, setShowGaia] = useState(true);
  const [showCenterPolarization, setShowCenterPolarization] = useState(false);
  const [showCounterjet, setShowCounterjet] = useState(false);
  const [showSuperclusterFlows, setShowSuperclusterFlows] = useState(false);
  const [clusterLayer, setClusterLayer] = useState<ClusterLayer>('galaxies');
  const groupView = pathname === LOCAL_GROUP_PATH;
  const pathGalaxy = galaxies.find(({ id }) => pathname === galaxyPath(id));
  const activeGalaxy = pathGalaxy ?? (groupView ? localGroup.galaxies.find(({ id }) => galaxyParam === id) : undefined) ?? milkyWay;
  const [spaceEntry, setSpaceEntry] = useState<ZoomHandoff>();
  const galaxySystems = useMemo(() => systems.filter((item) => (item.galaxyId ?? milkyWay.id) === activeGalaxy.id), [activeGalaxy.id]);
  const systemMarkers = useMemo(() => galaxySystems.flatMap((item) => (item.galaxyMarkerKpc ? [{ id: item.id, name: item.name, position: item.galaxyMarkerKpc }] : [])), [galaxySystems]);
  const selectedSystem = galaxySystems.find((item) => item.id === systemParam);
  const externalGalaxy = !!pathGalaxy && pathGalaxy.id !== milkyWay.id;
  const extraView = cosmicView || groupView || (externalGalaxy && !selectedSystem);
  const system = selectedSystem ?? systems[0];
  const systemId = String(system.id);
  const galaxyObjects = useMemo(() => featuredObjects.filter((item) => !item.parentObjectId && (item.galaxyId ?? milkyWay.id) === activeGalaxy.id), [activeGalaxy.id]);
  const objectMarkers = useMemo(
    () => galaxyObjects.map((object) => ({ object, position: featuredGalaxyPosition(object, activeGalaxy) })),
    [activeGalaxy, galaxyObjects],
  );
  const parentObjectId = featuredObjects.find(({ id }) => id === targetParam)?.parentObjectId;
  const featuredObject = !cosmicView && !groupView && viewParam === 'object' ? galaxyObjects.find(({ id }) => id === (parentObjectId ?? targetParam)) : undefined;
  const neighborhoodView = !externalGalaxy && !extraView && (viewParam === 'neighborhood' || (!pathGalaxy && !systemParam && !targetParam && !viewParam));
  const around = neighborhoodView ? aroundParam : null;
  const aroundGaiaId = readGaiaSourceId(around);
  const aroundSource = useGaiaSource(aroundGaiaId);
  const awaitingAroundSource = !!aroundGaiaId && !aroundSource;
  const aroundStar = around ? gaiaSystemCenters.get(around) : undefined;
  const aroundPosition = aroundStar?.position ?? aroundSource?.source?.position;
  const aroundCounterpart = aroundGaiaId ? gaiaCounterpartsBySource.get(aroundGaiaId) : undefined;
  const systemCounterparts = gaiaCounterpartsForSystem(around);
  const excludedSourceIds = systemCounterparts?.map(({ sourceId }) => sourceId).join(',') ?? aroundGaiaId ?? '';
  const aroundRadius = readGaiaNeighborRadius(radiusParam);
  const neighbors = useGaiaNeighbors(aroundPosition, aroundRadius, excludedSourceIds);
  const aroundName = aroundStar ? catalogText(aroundStar.name)
    : aroundCounterpart?.name ? catalogText(aroundCounterpart.name) : around ? `Gaia DR3 ${around}` : undefined;
  const outerRegion = system.outerRegion;
  const cloud = system.oortCloud;
  const overview: Overview =
    viewParam === 'oort' && cloud ? 'oort' : viewParam === 'outer' && outerRegion ? 'outer' : viewParam === 'distant' && (outerRegion || system.wideOverview) ? 'distant' : null;
  const root = system.bodies[0];
  const galaxyAnchor = systems.find((item) => item.id === milkyWay.systemId);
  const hasGalaxy = !externalGalaxy && !!galaxyAnchor && isNearbySystem(system);
  // 가장 넓은 반경으로도 Gaia 표본(약 163광년)에 닿지 않는 계는 주변 관측원 버튼을 숨긴다.
  const gaiaReachable = hasGalaxy && (system.neighborhood?.distanceLightYears ?? 0) - Math.max(...gaiaNeighborRadii) <= gaiaSampleRadiusLightYears;
  const [centerZoom, setCenterZoom] = useState<{ close: boolean; entry: ZoomHandoff } | null>(null);
  const [wheelView, setWheelView] = useState<{ scene: 'system' | 'galaxy'; entry: ZoomHandoff } | null>(null);
  const galaxyView =
    !extraView &&
    hasGalaxy &&
    (wheelView ? wheelView.scene === 'galaxy' : viewParam === 'galaxy' || targetParam === milkyWay.center.id || (!!pathGalaxy && !systemParam && !targetParam && !viewParam));
  const focusGalacticCenter = galaxyView && targetParam === milkyWay.center.id;
  const focusBlackHole = focusGalacticCenter && (centerZoom?.close ?? true);
  const animatedAccretion = distantObject?.kind === 'quasar' || featuredObject?.kind === 'black-hole'
    || featuredObject?.kind === 'x-ray-binary' || (extraView && galaxyObjects.find(({ id }) => id === focus)?.kind === 'black-hole');
  const featuredShape = featuredObject?.observationImage?.shape;
  const animatedFeaturedVolume = !!featuredObject?.stellarWind || featuredShape === 'bipolar-jet' || featuredShape === 'shocked-shell' || featuredShape === 'dust-spiral' || featuredShape === 'edge-on-disk' || featuredShape === 'light-echo';
  const heading = region
    ? association
      ? association.name
      : region.name
    : universeView
      ? (distantObject?.name ?? observableUniverse.name)
      : featuredObject
        ? featuredObject.name
        : groupView
          ? localGroup.name
          : extraView
            ? activeGalaxy.name
            : neighborhoodView
              ? milkyWay.neighborhood.name
              : galaxyView
                ? milkyWay.name
                : system.name;
  useEffect(() => {
    document.title = `${catalogText(heading)} | ${t(SITE_NAME_KEY)}`;
  }, [catalogText, heading, t]);
  const body = system.bodies.find((other) => other.id === targetParam && (!galaxyView || other === root));
  const target: Target = wheelView?.scene === 'system' ? null : (body?.id ?? null);
  const [scale, setScale] = useState<ZoomScale>(target === null ? (overview ?? 'system') : 'system');
  const oortView = !galaxyView && !!cloud && scale === 'oort';
  const outerBodies = system.bodies.filter((other) => other.region === 'outer');
  const outerSelection = body?.region ? body : outerBodies.find((other) => other.id === body?.parent);
  const showOuterNavigation = outerRegion && (scale === 'outer' || scale === 'distant' || outerSelection !== undefined);
  const navigation = oortView
    ? []
    : showOuterNavigation
      ? outerBodies
      : system.bodies.filter((other) => other.parent === null || (other.parent === root.id && !other.region) || (isMultiStar(system) && other.kind === 'planet'));
  const simulationDaysRef = useRef(0);
  const accretionPlaybackTime = useRef(0);
  const distanceBar = useRef<HTMLDivElement>(null);
  const reportDistance = useCallback(
    (kmPerPixel: number) => {
      const bar = distanceBar.current;
      if (!bar || !Number.isFinite(kmPerPixel) || kmPerPixel <= 0) return;
      const { label, pixels } = distanceScale(kmPerPixel, locale, number);
      const text = t('navigation.sceneScaleValue', [label]);
      if (bar.textContent !== text) bar.textContent = text;
      const width = `${pixels}px`;
      if (bar.style.getPropertyValue('--scale-width') !== width) bar.style.setProperty('--scale-width', width);
    },
    [locale, number, t],
  );
  // 동작 줄이기 설정이면 공전을 멈춘 채 시작한다(Explorer 는 ssr:false 라 window 를 바로 읽는다).
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [galacticDemo, setGalacticDemo] = useState(false);
  const [daysPerSecond, setDaysPerSecond] = useState(REALTIME_DAYS_PER_SECOND);
  useEffect(() => {
    if (paused) return;
    const accretionRate = Math.max(0.18, 1 + 0.32 * Math.log10(daysPerSecond / REALTIME_DAYS_PER_SECOND));
    let previous = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const seconds = Math.max(0, now - previous) / 1000;
      simulationDaysRef.current += elapsedSimulationDays(seconds, daysPerSecond);
      accretionPlaybackTime.current += Math.min(seconds, 0.1) * accretionRate;
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [daysPerSecond, paused]);
  const [recenter, setRecenter] = useState(0);
  const [hovered, setHovered] = useState<HoveredBody | null>(null);
  const hoveredBody = hovered && system.bodies.find((other) => other.id === hovered.id);
  const [comparison, setComparison] = useState<{ origin: string; destination: Target } | null>(null);
  const canCompare = target !== null && system.home === true && !galaxyView && !cosmicView && !extraView && !featuredObject && !neighborhoodView;
  const activeComparison = canCompare && comparison?.origin === target ? comparison : null;
  const comparisonBody = activeComparison && system.bodies.find((item) => item.id === activeComparison.destination);
  const distanceTarget = activeComparison ? activeComparison.destination : hovered?.id ?? null;
  const [distanceStore] = useState(createDistanceStore);
  const distanceOrigin = canCompare ? system.bodies.find((body) => body.id === target) : undefined;

  useEffect(() => {
    const resetWheelView = () => {
      setWheelView(null);
      setCenterZoom(null);
      setSpaceEntry(undefined);
      setHovered(null);
      setComparison(null);
    };
    window.addEventListener('popstate', resetWheelView);
    return () => window.removeEventListener('popstate', resetWheelView);
  }, []);

  useEffect(() => {
    if (!hasGalaxy) return;
    if (galaxyView) void import('./scenes/system-scene');
    else if (oortView) void import('./scenes/galaxy-scene');
  }, [galaxyView, hasGalaxy, oortView]);

  const enterGalaxy = useCallback((entry: ZoomHandoff) => {
    setHovered(null);
    setComparison(null);
    setWheelView({ scene: 'galaxy', entry });
    recordView(locale, null, 'galaxy', systemId, DEFAULT_SYSTEM_ID, milkyWay.id);
  }, [locale, systemId, setHovered, setComparison]);
  const enterZoomedSystem = useCallback((entry: ZoomHandoff) => {
    setHovered(null);
    const next = systemId === DEFAULT_SYSTEM_ID ? 'neighborhood' : null;
    setWheelView(next ? null : { scene: 'system', entry });
    recordView(locale, null, next, systemId, DEFAULT_SYSTEM_ID, milkyWay.id);
  }, [locale, systemId, setHovered]);

  const navigateTo = useCallback(
    (next: Target, nextOverview: ExplorerView = null, nextSystem = systemId) => {
      setHovered(null);
      setComparison(null);
      setWheelView(null);
      setCenterZoom(null);
      setSpaceEntry(undefined);
      if (!recordView(locale, next, nextOverview, nextSystem, DEFAULT_SYSTEM_ID, systems.find((item) => item.id === nextSystem)?.galaxyId ?? milkyWay.id)) setRecenter((revision) => revision + 1);
    },
    [locale, systemId, setHovered, setComparison],
  );

  const navigateSpace = useCallback(
    (url: string, entry?: ZoomHandoff) => {
      setHovered(null);
      setComparison(null);
      setWheelView(null);
      setCenterZoom(null);
      setSpaceEntry(entry);
      setShowCounterjet(false);
      setClusterLayer('galaxies');
      const current = new URL(window.location.href);
      const destination = new URL(withLocale(url, locale), current);
      if (current.href !== destination.href) window.history.pushState(null, '', destination);
      else setRecenter((revision) => revision + 1);
    },
    [locale, setHovered, setComparison, setShowCounterjet, setClusterLayer],
  );
  const clearGaiaSource = () => navigateSpace(gaiaSourcePath(undefined, around ?? undefined, aroundRadius));
  // 주변 관측원 화면(?around=)은 정보 패널을 기본으로 연다.
  const openGaiaNeighbors = useCallback((id: string) => navigateSpace(gaiaSourcePath(undefined, id)), [navigateSpace]);
  const selectGaiaNeighbor = (id: string) => navigateSpace(gaiaSourcePath(id, around ?? undefined, aroundRadius));
  const enterUniverse = useCallback((entry?: ZoomHandoff) => navigateSpace(UNIVERSE_PATH, entry), [navigateSpace]);
  const selectDistantObject = useCallback((id: string) => navigateSpace(distantObjectPath(id)), [navigateSpace]);
  const exitDistantObject = useCallback((id: string) => navigateSpace(universeFocusPath(id)), [navigateSpace]);

  const containingAssociation = galaxyAssociations.find(({ members }) => members.some(({ id }) => id === activeGalaxy.id));
  const groupFocusId = containingAssociation || activeGalaxy.superclusterId ? milkyWay.id : activeGalaxy.id;
  const enterLocalGroup = useCallback((entry?: ZoomHandoff) => navigateSpace(localGroupPath(groupFocusId), entry), [groupFocusId, navigateSpace]);
  const enterAssociation = useCallback(
    (id: string) => {
      const item = galaxyAssociations.find((group) => group.id === id);
      if (item) navigateSpace(associationPath(item.mapRegionId, id));
    },
    [navigateSpace],
  );
  const enterRegion = useCallback((id: string, entry?: ZoomHandoff) => navigateSpace(superclusterPath(id), entry), [navigateSpace]);
  // superclusters 는 안쪽 → 바깥 순서, 우주 전체는 마지막 다음 칸.
  const regionIndex = region ? superclusters.indexOf(region) : superclusters.length;
  const zoomInCosmic = useCallback(
    (entry?: ZoomHandoff) => {
      const inner = superclusters[regionIndex - 1];
      if (inner) enterRegion(inner.id, entry);
      else navigateSpace(localGroupPath(milkyWay.id), entry);
    },
    [navigateSpace, enterRegion, regionIndex],
  );
  const zoomOutCosmic = useCallback(
    (entry: ZoomHandoff) => {
      if (association) enterRegion(association.mapRegionId);
      else if (superclusters[regionIndex + 1]) enterRegion(superclusters[regionIndex + 1].id, entry);
      else enterUniverse(entry);
    },
    [association, enterRegion, enterUniverse, regionIndex],
  );
  const leaveLocalGroup = useCallback((entry: ZoomHandoff) => enterRegion(superclusters[0].id, entry), [enterRegion]);

  const enterExternalGalaxy = useCallback((item: Galaxy, entry?: ZoomHandoff) => navigateSpace(galaxyPath(item.id), entry), [navigateSpace]);

  const selectCatalogGalaxy = useCallback((id: string) => navigateSpace(galaxyPath(id)), [navigateSpace]);
  const leaveGalaxy = useCallback(
    (entry: ZoomHandoff) => {
      if (containingAssociation) enterAssociation(containingAssociation.id);
      else if (activeGalaxy.superclusterId) enterRegion(activeGalaxy.superclusterId);
      else enterLocalGroup(entry);
    },
    [activeGalaxy.superclusterId, containingAssociation, enterAssociation, enterLocalGroup, enterRegion],
  );

  const enterMarkedSystem = useCallback((id: string, entry?: ZoomHandoff) => navigateSpace(systemPath(activeGalaxy.id, id), entry), [activeGalaxy.id, navigateSpace]);
  const returnToExternalGalaxy = useCallback(
    (entry: ZoomHandoff) => navigateSpace(galaxyFocusPath(activeGalaxy.id, systemId), entry),
    [activeGalaxy.id, navigateSpace, systemId],
  );

  const selectFeaturedObject = useCallback((id: string) => navigateSpace(featuredObjectPath(activeGalaxy.id, id)), [activeGalaxy.id, navigateSpace]);
  const featuredObjectId = featuredObject?.id;
  const featuredReturnDistanceAu = featuredObject ? featuredOverviewDistanceKpc(featuredObject) * AU_PER_KPC : 0;
  const leaveFeaturedObject = (direction: ZoomHandoff['direction']) => {
    if (featuredObjectId) navigateSpace(galaxyFocusPath(activeGalaxy.id, featuredObjectId), { direction, distanceAu: featuredReturnDistanceAu });
  };

  const selectSystem = useCallback((id: string) => navigateTo(null, null, id), [navigateTo]);

  const zoomGalacticCenter = useCallback((close: boolean, entry: ZoomHandoff) => {
    setCenterZoom({ close, entry });
  }, []);

  const selectGalacticCenter = useCallback(() => navigateSpace(systemPath(milkyWay.id, undefined, milkyWay.center.id)), [navigateSpace]);
  const openStarSystem = useCallback((item: StarSystem) => navigateSpace(systemPath(item.galaxyId ?? milkyWay.id, item.id, item.bodies[0].id)), [navigateSpace]);
  const focusNearbySystem = useCallback((item: StarSystem) => navigateTo(item.bodies[0].id, 'galaxy', item.id), [navigateTo]);

  const hoverBody = useCallback((id: string, x: number, y: number) => {
    setHovered({ id, x, y });
  }, [setHovered]);

  // memo(SystemScene) 가 hover 마다 다시 그려지지 않도록 안정된 콜백.
  const selectSystemBody = useCallback(
    (next: Target) => {
      if (!activeComparison) navigateTo(next);
      else if (next && next !== activeComparison.origin) {
        setComparison({ origin: activeComparison.origin, destination: next });
        setHovered(null);
      }
    },
    [activeComparison, navigateTo, setComparison, setHovered],
  );

  const leaveBody = useCallback((id: string) => {
    setHovered((current) => (current?.id === id ? null : current));
  }, [setHovered]);

  return (
    <>
      <div className={styles.viewport} onPointerLeave={() => setHovered(null)} onPointerCancel={() => setHovered(null)} onWheelCapture={() => setHovered(null)}>
        {cosmicView ? (
          <UniverseScene
            key={`${distantObject ? `object:${distantObject.id}` : `map:${pathname}:${association?.id ?? ''}:${focus ?? ''}`}:${recenter}`}
            object={distantObject}
            region={region}
            association={association}
            onSelectCluster={enterAssociation}
            onStepIn={zoomInCosmic}
            onStepOut={zoomOutCosmic}
            showCounterjet={showCounterjet}
            showSuperclusterFlows={showSuperclusterFlows}
            clusterLayer={clusterLayer}
            accretionPlaybackTime={accretionPlaybackTime}
            focus={focus ?? undefined}
            entry={spaceEntry}
            reportDistance={reportDistance}
            onSelectGalaxy={selectCatalogGalaxy}
            onSelectDistantObject={selectDistantObject}
            onExitDistantObject={exitDistantObject}
          />
        ) : featuredObject ? (
          <FeaturedObjectScene
            key={featuredObject.id}
            object={featuredObject}
            reportDistance={reportDistance}
            simulationDaysRef={simulationDaysRef}
            accretionPlaybackTime={accretionPlaybackTime}
            daysPerSecond={daysPerSecond}
            paused={paused}
            onLeave={leaveFeaturedObject}
          />
        ) : extraView ? (
          <LocalGroupScene
            key={`${pathname}:${recenter}`}
            overview={groupView}
            centerOnGalaxy={groupView && galaxyParam === activeGalaxy.id}
            galaxy={activeGalaxy}
            entry={spaceEntry}
            reportDistance={reportDistance}
            onEnterGalaxy={enterExternalGalaxy}
            onExitGalaxy={leaveGalaxy}
            onExitGroup={leaveLocalGroup}
            systemMarkers={systemMarkers}
            objectMarkers={objectMarkers}
            accretionPlaybackTime={accretionPlaybackTime}
            onSelectObject={selectFeaturedObject}
            focusId={focus ?? undefined}
            onSelectSystem={enterMarkedSystem}
          />
        ) : neighborhoodView ? (
          <NeighborhoodScene
            key={around ?? 'neighborhood'}
            sourceId={gaiaParam}
            aroundPosition={aroundPosition}
            aroundRadius={aroundRadius}
            neighbors={neighbors?.entries}
            onOpenNeighbors={openGaiaNeighbors}
            onSelectAroundSource={selectGaiaNeighbor}
            onClearSource={clearGaiaSource}
            showGaia={showGaia}
            systems={galaxySystems}
            onSelect={selectSystem}
            onExit={enterGalaxy}
            reportDistance={reportDistance}
          />
        ) : galaxyView && galaxyAnchor ? (
          <GalaxyScene
            anchor={galaxyAnchor}
            reportDistance={reportDistance}
            system={system}
            systems={galaxySystems}
            onSelectSystem={openStarSystem}
            onSelectObject={selectFeaturedObject}
            focusedObjectId={focus ?? undefined}
            entry={wheelView?.entry}
            onZoomIn={enterZoomedSystem}
            onZoomOut={enterLocalGroup}
            groupEntry={spaceEntry}
            target={focusGalacticCenter ? milkyWay.center.id : target}
            blackHoleView={focusBlackHole}
            showCenterPolarization={showCenterPolarization}
            centerEntry={centerZoom?.entry}
            onCenterZoom={zoomGalacticCenter}
            simulationDaysRef={simulationDaysRef}
            accretionPlaybackTime={accretionPlaybackTime}
            paused={paused}
            daysPerSecond={daysPerSecond}
            demo={galacticDemo}
            onSelectCenter={selectGalacticCenter}
            recenter={recenter}
          />
        ) : (
          <SystemScene
            key={system.id}
            reportDistance={reportDistance}
            system={system}
            entry={externalGalaxy ? spaceEntry : wheelView?.entry}
            onZoomOut={hasGalaxy ? enterGalaxy : externalGalaxy && system.galaxyMarkerKpc ? returnToExternalGalaxy : undefined}
            target={target}
            hoveredTarget={hovered?.id ?? null}
            distanceTarget={distanceTarget}
            comparisonTarget={activeComparison?.destination ?? null}
            overview={overview}
            paused={paused}
            simulationDaysRef={simulationDaysRef}
            recenter={recenter}
            onSelect={selectSystemBody}
            onScaleChange={setScale}
            onHoverBody={hoverBody}
            onLeaveBody={leaveBody}
            onHoverDistance={distanceStore.set}
          />
        )}
      </div>
      {!activeComparison && hovered && hoveredBody && <BodyTooltip body={hoveredBody} x={hovered.x} y={hovered.y}
        distanceFrom={distanceOrigin && { store: distanceStore, origin: distanceOrigin }} />}

      <header className={styles.header}>
        <div className={styles.brand}>
          <h1>{t(SITE_NAME_KEY)}</h1>
          <p className={styles.currentLocation} aria-live="polite" aria-atomic="true">
            {catalogText(heading)}
            {focusBlackHole ? ` · ${catalogText(milkyWay.center.name)}` : body && (galaxyView || target !== null) ? ` · ${catalogText(body.name)}` : ''}
          </p>
        </div>
        <div className={styles.headerActions}>
          <CatalogSearch
            systems={systems}
            onSelect={navigateSpace}
            currentPath={searchParams.size ? `${pathname}?${searchParams}` : pathname}
            currentName={body && (galaxyView || target !== null) ? `${catalogText(heading)} · ${catalogText(body.name)}` : aroundName ? `${catalogText(heading)} · ${aroundName}` : catalogText(heading)}
            quickLinks={[
              ...(!cosmicView && !groupView && !externalGalaxy && !neighborhoodView
                ? [{ label: catalogText(milkyWay.neighborhood.name), onSelect: () => navigateTo(null, 'neighborhood') }] : []),
              ...(!cosmicView && !groupView && !externalGalaxy && (galaxyView || neighborhoodView || system.id !== DEFAULT_SYSTEM_ID || target !== null)
                ? [{ label: catalogText(galaxyAnchor?.name ?? systems[0].name), onSelect: () => selectSystem(DEFAULT_SYSTEM_ID) }] : []),
              ...(!galaxyView || focusGalacticCenter || activeGalaxy.id !== milkyWay.id
                ? [{ label: catalogText(milkyWay.name), onSelect: () => enterExternalGalaxy(milkyWay) }] : []),
              ...(!groupView ? [{ label: catalogText(localGroup.name), onSelect: () => enterLocalGroup() }] : []),
              ...(!universeView || distantObject ? [{ label: catalogText(observableUniverse.name), onSelect: () => enterUniverse() }] : []),
            ].slice(0, 4)}
          >
            <div className={styles.controls} role="group" aria-label={t('navigation.galacticScales')}>
              <h2>{t('navigation.galacticScales')}</h2>
              <button type="button" aria-pressed={universeView && !distantObject} onClick={() => enterUniverse()}>
                {catalogText(observableUniverse.name)}
              </button>
              {superclusters.map((item) => (
                <button key={item.id} type="button" aria-pressed={item === region && !association} onClick={() => enterRegion(item.id)}>
                  {catalogText(item.name)}
                </button>
              ))}
              {galaxyAssociations.map((item) => (
                <button key={item.id} type="button" aria-pressed={association === item} onClick={() => enterAssociation(item.id)}>
                  {catalogText(item.name)}
                </button>
              ))}
              <button type="button" aria-pressed={groupView} onClick={() => enterLocalGroup()}>
                {catalogText(localGroup.name)}
              </button>
              {galaxies.map((item) => (
                <button key={item.id} type="button" aria-pressed={!cosmicView && !groupView && (extraView || galaxyView) && activeGalaxy.id === item.id} onClick={() => enterExternalGalaxy(item)}>
                  {catalogText(item.name)}
                </button>
              ))}
            </div>
            {universeView && (
              <div className={styles.controls} role="group" aria-label={t('navigation.distantObjects')}>
                <h2>{t('navigation.distantObjects')}</h2>
                {distantObjects.map((item) => (
                  <button key={item.id} type="button" aria-pressed={distantObject?.id === item.id} onClick={() => selectDistantObject(item.id)}>
                    {catalogText(item.name)}
                  </button>
                ))}
              </div>
            )}
            {groupView && (
              <div className={styles.controls} role="group" aria-label={t('navigation.scrollTargets')}>
                <h2>{t('navigation.scrollTargets')}</h2>
                {localGroup.galaxies.map((item) => (
                  <button key={item.id} type="button" aria-pressed={activeGalaxy.id === item.id} onClick={() => navigateSpace(localGroupPath(item.id))}>
                    {t('navigation.focusOn', [catalogText(item.name)])}
                  </button>
                ))}
              </div>
            )}
            {!cosmicView && !groupView && galaxyObjects.length > 0 && (
              <div className={styles.controls} role="group" aria-label={t('navigation.featuredObjects')}>
                <h2>{t('navigation.featuredObjects')}</h2>
                {galaxyObjects.map((item) => (
                  <button key={item.id} type="button" aria-pressed={featuredObject?.id === item.id} onClick={() => selectFeaturedObject(item.id)}>
                    {catalogText(item.name)}
                  </button>
                ))}
              </div>
            )}
            {extraView && !cosmicView && !groupView && (activeGalaxy.parentGalaxyId || localGroup.galaxies.some(({ parentGalaxyId }) => parentGalaxyId === activeGalaxy.id)) && (
              <div className={styles.controls} role="group" aria-label={t('navigation.relatedGalaxies')}>
                <h2>{t('navigation.relatedGalaxies')}</h2>
                {localGroup.galaxies
                  .filter((item) => item.id === activeGalaxy.parentGalaxyId || item.parentGalaxyId === activeGalaxy.id)
                  .map((item) => (
                    <button key={item.id} type="button" onClick={() => enterExternalGalaxy(item)}>
                      {catalogText(item.name)}
                    </button>
                  ))}
              </div>
            )}
            {!cosmicView && !groupView && galaxySystems.length > 0 && (
              <div className={styles.controls} role="group" aria-label={t('navigation.selectStarSystem')}>
                <h2>{t('navigation.starSystems')}</h2>
                {!externalGalaxy && (
                  <button type="button" aria-pressed={neighborhoodView} onClick={() => navigateTo(null, 'neighborhood')}>
                    {catalogText(milkyWay.neighborhood.name)}
                  </button>
                )}
                {galaxySystems.map((item) => (
                  <button key={item.id} type="button" aria-pressed={!extraView && !neighborhoodView && item === system} onClick={() => selectSystem(item.id)}>
                    {catalogText(item.name)}
                  </button>
                ))}
              </div>
            )}
            {!featuredObject && !neighborhoodView && !extraView && (
              <div className={styles.controls} role="group" aria-label={t('navigation.cameraViews')}>
                <h2>{t('navigation.currentView')}</h2>
                <button type="button" aria-pressed={!galaxyView && target === null && scale === 'system' && overview !== 'distant'} onClick={() => navigateTo(null)}>
                  {catalogText(system.overviewLabel ?? 'navigation.planetarySystem')}
                </button>
                {system.wideOverview && (
                  <button type="button" aria-pressed={target === null && overview === 'distant'} onClick={() => navigateTo(null, 'distant')}>
                    {catalogText(system.wideOverview.label)}
                  </button>
                )}
                {outerRegion && (
                  <button type="button" aria-pressed={!galaxyView && (scale === 'outer' || scale === 'distant' || (!oortView && outerSelection !== undefined))} onClick={() => navigateTo(null, 'outer')}>
                    {catalogText(outerRegion.name)}
                  </button>
                )}
                {cloud && (
                  <button type="button" aria-pressed={oortView} onClick={() => navigateTo(null, 'oort')}>
                    {t('navigation.oortCloud')}
                  </button>
                )}
                {hasGalaxy && (
                  <button type="button" aria-pressed={galaxyView && !focusGalacticCenter && !body} onClick={() => navigateTo(null, 'galaxy')}>
                    {t('navigation.entireGalaxy')}
                  </button>
                )}
                {galaxyView ? (
                  <>
                    {galaxySystems.filter(isNearbySystem).map((item) => (
                      <button key={item.id} type="button" aria-pressed={item === system && body === root} onClick={() => focusNearbySystem(item)}>
                        {t('navigation.around', [catalogText(item.name)])}
                      </button>
                    ))}
                    <button type="button" aria-pressed={focusBlackHole} onClick={selectGalacticCenter}>
                      {catalogText(milkyWay.center.name)}
                    </button>
                  </>
                ) : (
                  navigation.map((item) => (
                    <button key={item.id} type="button" aria-pressed={target === item.id || (item !== root && body?.parent === item.id)} onClick={() => selectSystemBody(item.id)}>
                      {catalogText(item.name)}
                    </button>
                  ))
                )}
              </div>
            )}
          </CatalogSearch>
          <LanguageSelect />
        </div>
      </header>

      <footer className={styles.footer}>
        <div className={styles.playback}>
          <button type="button" onClick={() => setPaused((wasPaused) => !wasPaused)}>
            {paused ? t('playback.resume') : t('playback.pause')}
          </button>
          <label className={styles.speed}>
            <span>{t('playback.speed')}</span>
            <select value={daysPerSecond} onChange={(event) => setDaysPerSecond(Number(event.target.value))}>
              <option value={REALTIME_DAYS_PER_SECOND}>{t('playback.realTime')}</option>
              <option value={REALTIME_DAYS_PER_SECOND / 60}>{t('playback.slowMotion')}</option>
              <option value={1}>{t('playback.oneDay')}</option>
              <option value={5}>{t('playback.fiveDays')}</option>
              <option value={50}>{t('playback.fiftyDays')}</option>
              <option value={500}>{t('playback.fiveHundredDays')}</option>
            </select>
          </label>
          {!featuredObject && !neighborhoodView && galaxyView && !focusBlackHole && (
            <>
              <button type="button" aria-pressed={galacticDemo} onClick={() => setGalacticDemo((playing) => !playing)}>
                {galacticDemo ? t('playback.stopGalacticDemo') : t('playback.startGalacticDemo')}
              </button>
              {galacticDemo && <p className={styles.hint}>{t('playback.galacticDemoSpeed', [measurement(milkyWay.demoYearsPerSecond, 1e4, 0)])}</p>}
            </>
          )}
          {!animatedAccretion && !animatedFeaturedVolume && (distantObject || cosmicView || extraView || neighborhoodView || (featuredObject && !featuredObject.spinSeconds && !featuredObject.variabilityDays && !featuredObject.expansionPerYear)) && (
            <p className={styles.hint}>{t('playback.fixedLayout')}</p>
          )}
          {!focusBlackHole && (!distantObject || distantObject.observationScale) && (!featuredObject || (featuredObject.extentLightYears > 0 && featuredObject.kind !== 'black-hole')) && (
            <div
              key={distantObject?.id ?? featuredObject?.id ?? (extraView ? pathname : neighborhoodView ? 'neighborhood' : galaxyView ? 'galaxy' : system.id)}
              ref={distanceBar}
              className={styles.distanceBar}
              role="group"
              aria-label={t('navigation.distanceScale')}
              title={t('navigation.scaleHint')}
            />
          )}
          <p className={styles.hint}>{t('navigation.cameraInstructions')}</p>
          {canCompare && target && (
            <div className={styles.distanceComparison}>
              <button type="button" aria-pressed={Boolean(activeComparison)}
                onClick={() => {
                  setHovered(null);
                  setComparison(activeComparison ? null : { origin: target, destination: null });
                }}
              >
                {t('details.compareDistance')}
              </button>
              {activeComparison && distanceOrigin && <ComparisonDistance store={distanceStore} origin={distanceOrigin} destination={comparisonBody || undefined} />}
            </div>
          )}
        </div>
        <div className={styles.infoControls}>
          <button
            ref={infoButton}
            type="button"
            className={styles.infoTrigger}
            aria-expanded={infoOpen}
            aria-controls={infoId}
            aria-label={t(infoOpen ? 'details.hideInfo' : 'details.showInfo')}
            onClick={() => setInfoPreference(!infoOpen)}
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5m0-8v.01" />
            </svg>
          </button>
          <div id={infoId} className={styles.infoPanel} data-default={infoPreference === undefined && !neighborsByDefault || undefined} hidden={!infoOpen}>
            {region ? (
              <SuperclusterDetails region={region} association={association} onSelectCluster={enterAssociation} onSelectGalaxy={selectCatalogGalaxy}
                showFlows={showSuperclusterFlows} onFlowsChange={setShowSuperclusterFlows} />
            ) : universeView ? (
              <UniverseDetails object={distantObject} showCounterjet={showCounterjet} onCounterjetChange={setShowCounterjet} clusterLayer={clusterLayer} onClusterLayerChange={setClusterLayer} />
            ) : featuredObject ? (
              <FeaturedObjectDetails object={featuredObject} />
            ) : groupView ? (
              <LocalGroupDetails focus={activeGalaxy} />
            ) : extraView ? (
              <GalaxySummaryDetails galaxy={activeGalaxy} />
            ) : neighborhoodView ? (
              <NeighborhoodDetails showGaia={showGaia} onGaiaChange={setShowGaia}
                aroundName={aroundName} neighbors={neighbors}
                radius={aroundRadius}
                onChangeRadius={(radius: GaiaNeighborRadius) => navigateSpace(gaiaSourcePath(undefined, around ?? undefined, radius))}
                counterparts={systemCounterparts ?? (aroundCounterpart ? [aroundCounterpart] : undefined)}
                awaitingCenter={awaitingAroundSource}
                centerUnavailable={!aroundPosition && !awaitingAroundSource}
                selectedId={gaiaParam} onSelectNeighbor={selectGaiaNeighbor}
                onCloseNeighbors={() => navigateSpace(gaiaSourcePath())}
              />
            ) : focusBlackHole ? (
              <BlackHoleDetails key={recenter} onClose={closeInfo} showPolarization={showCenterPolarization} onPolarizationChange={setShowCenterPolarization} />
            ) : body && !oortView && (galaxyView || target !== null) ? (
              <BodyDetails key={`${body.id}:${recenter}`} system={system} body={body} onSelect={navigateTo} onClose={closeInfo} onOpenNeighbors={gaiaReachable ? () => openGaiaNeighbors(systemId) : undefined} />
            ) : galaxyView ? (
              <GalaxyDetails systems={galaxySystems} />
            ) : oortView && cloud ? (
              <OortCloudDetails cloud={cloud} />
            ) : (scale === 'outer' || scale === 'distant') && outerRegion ? (
              <OuterRegionDetails system={system} distant={scale === 'distant'} onToggle={() => navigateTo(null, scale === 'distant' ? 'outer' : 'distant')} />
            ) : (
              <SystemDetails system={system} onOpenNeighbors={gaiaReachable ? () => openGaiaNeighbors(systemId) : undefined} />
            )}
          </div>
        </div>
      </footer>
    </>
  );
}
