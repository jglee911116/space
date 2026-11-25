'use client';

import { useLanguage } from '@/i18n/language';
import { withLocale, withoutLocale } from '@/i18n/routing';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { galaxyAssociations, milkyWay, superclusters, systems, type ClusterLayer, type Galaxy, type StarSystem } from '@/constants/space';
import { SITE_NAME_KEY } from '@/constants/site';
import { AU_PER_KPC } from '@/constants/space/units';
import { BodyTooltip } from '../details';
import { createDistanceStore } from '../utils/distance-store';
import { associationPath, distantObjectPath, featuredObjectPath, galaxyFocusPath, galaxyPath, localGroupPath, superclusterPath, systemPath, UNIVERSE_PATH, universeFocusPath } from '../utils/paths';
import { featuredOverviewDistanceKpc, type ZoomHandoff, type ZoomScale } from '../utils/zoom';
import type { Target } from '../scenes/system-scene';
import { DetailsPanel } from './details-panel';
import { ExplorerHeader } from './explorer-header';
import { useDistanceBar, useDocumentTitle, useInfoPanel, usePlayback } from './hooks';
import { PlaybackBar } from './playback-bar';
import { FeaturedObjectScene, GalaxyScene, LocalGroupScene, NeighborhoodScene, SystemScene, UniverseScene } from './scene-loaders';
import { DEFAULT_SYSTEM_ID, explorerView, recordView, systemNavigation, type CenterZoom, type RecordedView, type WheelView } from './view-state';
import styles from '../explore.module.scss';

type HoveredBody = { id: string; x: number; y: number };

/** URL 이 정하는 화면을 장면·머리글·재생 막대·정보 패널로 조립하고, 화면 사이 이동을 맡는다. */
export function Explorer() {
  const { t, catalogText, locale } = useLanguage();
  const pathname = withoutLocale(usePathname());
  const searchParams = useSearchParams();
  const [wheelView, setWheelView] = useState<WheelView>(null);
  const [centerZoom, setCenterZoom] = useState<CenterZoom>(null);
  // useMemo 결과는 불변으로 취급돼 React 컴파일러가 아래 콜백 메모이제이션을 유지할 수 있다.
  const view = useMemo(() => explorerView(pathname, searchParams, wheelView, centerZoom), [pathname, searchParams, wheelView, centerZoom]);
  const { focus, galaxy: galaxyParam } = view.query;
  const {
    region,
    association,
    distantObject,
    cosmicView,
    groupView,
    activeGalaxy,
    galaxySystems,
    externalGalaxy,
    extraView,
    system,
    featuredObject,
    neighborhoodView,
    galaxyView,
    hasGalaxy,
    target,
    body,
  } = view;
  const systemId = system.id;
  const [scale, setScale] = useState<ZoomScale>(target === null ? (view.overview ?? 'system') : 'system');
  const nav = useMemo(() => systemNavigation(view, scale), [view, scale]);
  const { oortView } = nav;
  // 정보 패널 열림/닫힘 선택은 지금 보는 화면에만 적용한다(이동하거나 뒤로 가면 기본값으로).
  const { infoId, infoButton, infoOpen, infoPreference, setInfoPreference, closeInfo } = useInfoPanel(`${pathname}?${searchParams}`);
  const { simulationDaysRef, accretionPlaybackTime, ...playback } = usePlayback();
  const { distanceBar, reportDistance } = useDistanceBar();
  const [showCenterPolarization, setShowCenterPolarization] = useState(false);
  const [showCounterjet, setShowCounterjet] = useState(false);
  const [showSuperclusterFlows, setShowSuperclusterFlows] = useState(false);
  const [clusterLayer, setClusterLayer] = useState<ClusterLayer>('galaxies');
  const [spaceEntry, setSpaceEntry] = useState<ZoomHandoff>();
  const [recenter, setRecenter] = useState(0);
  const [hovered, setHovered] = useState<HoveredBody | null>(null);
  const hoveredBody = hovered && system.bodies.find((other) => other.id === hovered.id);
  const [comparison, setComparison] = useState<{ origin: string; destination: Target } | null>(null);
  const canCompare = target !== null && system.home === true && !galaxyView && !cosmicView && !extraView && !featuredObject && !neighborhoodView;
  const activeComparison = canCompare && comparison?.origin === target ? comparison : null;
  const distanceTarget = activeComparison ? activeComparison.destination : (hovered?.id ?? null);
  const [distanceStore] = useState(createDistanceStore);
  const distanceOrigin = canCompare ? system.bodies.find((item) => item.id === target) : undefined;
  // 머리글(aria-live)과 최근 방문이 같은 위치 이름을 쓴다.
  const locationSubject = view.focusBlackHole ? catalogText(milkyWay.center.name) : body && (galaxyView || target !== null) ? catalogText(body.name) : undefined;
  const locationLabel = locationSubject ? `${catalogText(view.heading)} · ${locationSubject}` : catalogText(view.heading);

  useDocumentTitle(`${catalogText(view.heading)} | ${t(SITE_NAME_KEY)}`);

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
    if (galaxyView) void import('../scenes/system-scene');
    else if (oortView) void import('../scenes/galaxy-scene');
  }, [galaxyView, hasGalaxy, oortView]);

  const enterGalaxy = useCallback(
    (entry: ZoomHandoff) => {
      setHovered(null);
      setComparison(null);
      setWheelView({ scene: 'galaxy', entry });
      recordView(locale, null, 'galaxy', systemId, milkyWay.id);
    },
    [locale, systemId, setHovered, setComparison],
  );
  const enterZoomedSystem = useCallback(
    (entry: ZoomHandoff) => {
      setHovered(null);
      const next = systemId === DEFAULT_SYSTEM_ID ? 'neighborhood' : null;
      setWheelView(next ? null : { scene: 'system', entry });
      recordView(locale, null, next, systemId, milkyWay.id);
    },
    [locale, systemId, setHovered],
  );

  const navigateTo = useCallback(
    (next: Target, nextOverview: RecordedView = null, nextSystem = systemId) => {
      setHovered(null);
      setComparison(null);
      setWheelView(null);
      setCenterZoom(null);
      setSpaceEntry(undefined);
      if (!recordView(locale, next, nextOverview, nextSystem, systems.find((item) => item.id === nextSystem)?.galaxyId ?? milkyWay.id)) setRecenter((revision) => revision + 1);
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
  const returnToExternalGalaxy = useCallback((entry: ZoomHandoff) => navigateSpace(galaxyFocusPath(activeGalaxy.id, systemId), entry), [activeGalaxy.id, navigateSpace, systemId]);
  const selectFeaturedObject = useCallback((id: string) => navigateSpace(featuredObjectPath(activeGalaxy.id, id)), [activeGalaxy.id, navigateSpace]);
  const featuredObjectId = featuredObject?.id;
  const featuredReturnDistanceAu = featuredObject ? featuredOverviewDistanceKpc(featuredObject) * AU_PER_KPC : 0;
  const leaveFeaturedObject = (direction: ZoomHandoff['direction']) => {
    if (featuredObjectId) navigateSpace(galaxyFocusPath(activeGalaxy.id, featuredObjectId), { direction, distanceAu: featuredReturnDistanceAu });
  };
  const selectSystem = useCallback((id: string) => navigateTo(null, null, id), [navigateTo]);
  const zoomGalacticCenter = useCallback((close: boolean, entry: ZoomHandoff) => setCenterZoom({ close, entry }), []);
  const selectGalacticCenter = useCallback(() => navigateSpace(systemPath(milkyWay.id, undefined, milkyWay.center.id)), [navigateSpace]);
  const openStarSystem = useCallback((item: StarSystem) => navigateSpace(systemPath(item.galaxyId ?? milkyWay.id, item.id, item.bodies[0].id)), [navigateSpace]);
  const focusNearbySystem = useCallback((item: StarSystem) => navigateTo(item.bodies[0].id, 'galaxy', item.id), [navigateTo]);
  const hoverBody = useCallback((id: string, x: number, y: number) => setHovered({ id, x, y }), [setHovered]);
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
  const leaveBody = useCallback((id: string) => setHovered((current) => (current?.id === id ? null : current)), [setHovered]);

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
            key={`${featuredObject.id}:${recenter}`}
            object={featuredObject}
            reportDistance={reportDistance}
            simulationDaysRef={simulationDaysRef}
            accretionPlaybackTime={accretionPlaybackTime}
            daysPerSecond={playback.daysPerSecond}
            paused={playback.paused}
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
            systemMarkers={view.systemMarkers}
            objectMarkers={view.objectMarkers}
            accretionPlaybackTime={accretionPlaybackTime}
            simulationDaysRef={simulationDaysRef}
            onSelectObject={selectFeaturedObject}
            focusId={focus ?? undefined}
            onSelectSystem={enterMarkedSystem}
          />
        ) : neighborhoodView ? (
          <NeighborhoodScene systems={galaxySystems} onSelect={selectSystem} onExit={enterGalaxy} reportDistance={reportDistance} />
        ) : galaxyView && view.galaxyAnchor ? (
          <GalaxyScene
            anchor={view.galaxyAnchor}
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
            target={view.focusGalacticCenter ? milkyWay.center.id : target}
            blackHoleView={view.focusBlackHole}
            showCenterPolarization={showCenterPolarization}
            centerEntry={centerZoom?.entry}
            onCenterZoom={zoomGalacticCenter}
            simulationDaysRef={simulationDaysRef}
            accretionPlaybackTime={accretionPlaybackTime}
            paused={playback.paused}
            daysPerSecond={playback.daysPerSecond}
            demo={playback.galacticDemo}
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
            overview={view.overview}
            paused={playback.paused}
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
      {!activeComparison && hovered && hoveredBody && <BodyTooltip body={hoveredBody} x={hovered.x} y={hovered.y} distanceFrom={distanceOrigin && { store: distanceStore, origin: distanceOrigin }} />}

      <ExplorerHeader
        view={view}
        nav={nav}
        scale={scale}
        locationLabel={locationLabel}
        currentPath={searchParams.size ? `${pathname}?${searchParams}` : pathname}
        actions={{
          navigateSpace,
          navigateTo,
          selectSystem,
          selectSystemBody,
          enterExternalGalaxy,
          enterLocalGroup,
          enterUniverse,
          enterRegion,
          enterAssociation,
          selectDistantObject,
          selectFeaturedObject,
          focusNearbySystem,
          selectGalacticCenter,
        }}
      />

      <footer className={styles.footer}>
        <PlaybackBar
          view={view}
          playback={playback}
          pathname={pathname}
          distanceBar={distanceBar}
          comparison={
            canCompare && target
              ? {
                  active: Boolean(activeComparison),
                  onToggle: () => {
                    setHovered(null);
                    setComparison(activeComparison ? null : { origin: target, destination: null });
                  },
                  store: distanceStore,
                  origin: distanceOrigin,
                  destination: (activeComparison && system.bodies.find((item) => item.id === activeComparison.destination)) || undefined,
                }
              : undefined
          }
        />
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
          <div id={infoId} className={styles.infoPanel} data-default={infoPreference === undefined || undefined} hidden={!infoOpen}>
            <DetailsPanel
              view={view}
              nav={nav}
              scale={scale}
              recenter={recenter}
              layers={{
                showFlows: showSuperclusterFlows,
                onFlowsChange: setShowSuperclusterFlows,
                showCounterjet,
                onCounterjetChange: setShowCounterjet,
                clusterLayer,
                onClusterLayerChange: setClusterLayer,
                showPolarization: showCenterPolarization,
                onPolarizationChange: setShowCenterPolarization,
              }}
              onClose={closeInfo}
              onNavigate={navigateTo}
              onSelectCluster={enterAssociation}
              onSelectGalaxy={selectCatalogGalaxy}
            />
          </div>
        </div>
      </footer>
    </>
  );
}
