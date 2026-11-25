import {
  distantObjects,
  featuredObjects,
  galaxies,
  galaxyAssociations,
  localGroup,
  milkyWay,
  observableUniverse,
  superclusters,
  systems,
  type FeaturedObject,
  type StarSystem,
} from '@/constants/space';
import { withLocale } from '@/i18n/routing';
import type { Locale } from '@/i18n/messages';
import { isMultiStar } from '../details';
import { featuredGalaxyPosition, isNearbySystem } from '../utils/nearby-positions';
import { animatedVolumeShapes } from '../utils/orbit';
import { galaxyPath, HOME_PATH, LOCAL_GROUP_PATH, readExplorerQuery, superclusterPath, UNIVERSE_PATH, updateSystemLocation } from '../utils/paths';
import type { Overview, Target } from '../scenes/system-scene';
import type { ZoomHandoff, ZoomScale } from '../utils/zoom';

export const DEFAULT_SYSTEM_ID = systems[0].id;
/** 항성계 화면 주소에 남기는 보기(계 개요·외곽·오르트 구름·은하·이웃). */
export type RecordedView = Overview | 'galaxy' | 'neighborhood';
/** 휠로 항성계 ↔ 은하를 오갈 때 URL 이 바뀌기 전 장면을 잇는 상태. */
export type WheelView = { scene: 'system' | 'galaxy'; entry: ZoomHandoff } | null;
export type CenterZoom = { close: boolean; entry: ZoomHandoff } | null;

// 항성계 화면 주소는 systemPath 와 같은 꼴(?system=…)로 남겨 같은 화면에 주소가 둘 생기지 않게 한다.
export function recordView(locale: Locale, target: Target, overview: RecordedView, systemId: string, galaxyId: string) {
  const url = new URL(window.location.href);
  const path = withLocale(overview === 'neighborhood' ? HOME_PATH : galaxyPath(galaxyId), locale);
  const systemParam = overview === 'neighborhood' ? null : systemId;
  // 예전에 만든 주소(기본 계는 ?target=earth 처럼 system 생략)도 같은 화면으로 비교한다.
  if (systemParam && url.pathname === path && !url.searchParams.has('system') && (url.searchParams.has('target') || url.searchParams.has('view'))) url.searchParams.set('system', DEFAULT_SYSTEM_ID);
  if (!updateSystemLocation(url, path, systemParam, target, overview)) return false;

  window.history.pushState(null, '', url);
  return true;
}

// 은하마다 한 번만 만들어 같은 배열을 돌려준다 — memo 장면에 넘기는 props 가 렌더마다 바뀌지 않게.
function cached<T>(cache: Map<string, T>, key: string, make: () => T) {
  let value = cache.get(key);
  if (value === undefined) cache.set(key, (value = make()));
  return value;
}
const systemsByGalaxy = new Map<string, StarSystem[]>();
const objectsByGalaxy = new Map<string, FeaturedObject[]>();
const systemMarkersByGalaxy = new Map<string, { id: string; name: StarSystem['name']; position: NonNullable<StarSystem['galaxyMarkerKpc']> }[]>();
const objectMarkersByGalaxy = new Map<string, { object: FeaturedObject; position: ReturnType<typeof featuredGalaxyPosition> }[]>();

/** URL(경로·쿼리)과 휠 전환 상태에서 지금 보는 화면을 계산한다. */
export function explorerView(pathname: string, params: Pick<URLSearchParams, 'get'>, wheelView: WheelView, centerZoom: CenterZoom) {
  const query = readExplorerQuery(params);
  const { system: systemParam, target: targetParam, view: viewParam, focus, galaxy: galaxyParam, cluster: clusterParam } = query;
  const universeView = pathname === UNIVERSE_PATH;
  const region = superclusters.find(({ id }) => pathname === superclusterPath(id));
  const cosmicView = universeView || !!region;
  const association = viewParam === 'cluster' ? galaxyAssociations.find((item) => item.mapRegionId === region?.id && item.id === clusterParam) : undefined;
  const distantObject = universeView ? distantObjects.find(({ id }) => id === targetParam) : undefined;
  const groupView = pathname === LOCAL_GROUP_PATH;
  const pathGalaxy = galaxies.find(({ id }) => pathname === galaxyPath(id));
  const activeGalaxy = pathGalaxy ?? (groupView ? localGroup.galaxies.find(({ id }) => galaxyParam === id) : undefined) ?? milkyWay;
  const galaxySystems = cached(systemsByGalaxy, activeGalaxy.id, () => systems.filter((item) => (item.galaxyId ?? milkyWay.id) === activeGalaxy.id));
  const systemMarkers = cached(systemMarkersByGalaxy, activeGalaxy.id, () =>
    galaxySystems.flatMap((item) => (item.galaxyMarkerKpc ? [{ id: item.id, name: item.name, position: item.galaxyMarkerKpc }] : [])),
  );
  const selectedSystem = galaxySystems.find((item) => item.id === systemParam);
  const externalGalaxy = !!pathGalaxy && pathGalaxy.id !== milkyWay.id;
  const extraView = cosmicView || groupView || (externalGalaxy && !selectedSystem);
  const system = selectedSystem ?? systems[0];
  const galaxyObjects = cached(objectsByGalaxy, activeGalaxy.id, () => featuredObjects.filter((item) => !item.parentObjectId && (item.galaxyId ?? milkyWay.id) === activeGalaxy.id));
  const objectMarkers = cached(objectMarkersByGalaxy, activeGalaxy.id, () => galaxyObjects.map((object) => ({ object, position: featuredGalaxyPosition(object, activeGalaxy) })));
  const parentObjectId = featuredObjects.find(({ id }) => id === targetParam)?.parentObjectId;
  const featuredObject = !cosmicView && !groupView && viewParam === 'object' ? galaxyObjects.find(({ id }) => id === (parentObjectId ?? targetParam)) : undefined;
  const neighborhoodView = !externalGalaxy && !extraView && (viewParam === 'neighborhood' || (!pathGalaxy && !systemParam && !targetParam && !viewParam));
  const outerRegion = system.outerRegion;
  const cloud = system.oortCloud;
  const overview: Overview =
    viewParam === 'oort' && cloud ? 'oort' : viewParam === 'outer' && outerRegion ? 'outer' : viewParam === 'distant' && (outerRegion || system.wideOverview) ? 'distant' : null;
  const root = system.bodies[0];
  const galaxyAnchor = systems.find((item) => item.id === milkyWay.systemId);
  const hasGalaxy = !externalGalaxy && !!galaxyAnchor && isNearbySystem(system);
  const galaxyView =
    !extraView &&
    hasGalaxy &&
    (wheelView ? wheelView.scene === 'galaxy' : viewParam === 'galaxy' || targetParam === milkyWay.center.id || (!!pathGalaxy && !systemParam && !targetParam && !viewParam));
  const focusGalacticCenter = galaxyView && targetParam === milkyWay.center.id;
  const focusBlackHole = focusGalacticCenter && (centerZoom?.close ?? true);
  // 지도에서 초점을 둔 천체도 미리보기(FeaturedObjectPreview)가 강착 흐름을 재생하는 종류면 '고정 배치' 안내를 숨긴다.
  const focusedMapKind = extraView ? galaxyObjects.find(({ id }) => id === focus)?.kind : undefined;
  const animatedAccretion =
    distantObject?.kind === 'quasar' || featuredObject?.kind === 'black-hole' || featuredObject?.kind === 'x-ray-binary' || focusedMapKind === 'black-hole' || focusedMapKind === 'x-ray-binary';
  const featuredShape = featuredObject?.observationImage?.shape;
  const animatedFeaturedVolume = !!featuredObject?.stellarWind || (!!featuredShape && animatedVolumeShapes.has(featuredShape));
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
  const body = system.bodies.find((other) => other.id === targetParam && (!galaxyView || other === root));
  const target: Target = wheelView?.scene === 'system' ? null : (body?.id ?? null);
  return {
    query,
    universeView,
    region,
    cosmicView,
    association,
    distantObject,
    groupView,
    activeGalaxy,
    galaxySystems,
    systemMarkers,
    externalGalaxy,
    extraView,
    system,
    galaxyObjects,
    objectMarkers,
    featuredObject,
    neighborhoodView,
    outerRegion,
    cloud,
    overview,
    root,
    galaxyAnchor,
    hasGalaxy,
    galaxyView,
    focusGalacticCenter,
    focusBlackHole,
    animatedAccretion,
    animatedFeaturedVolume,
    heading,
    body,
    target,
  };
}

export type ExplorerViewState = ReturnType<typeof explorerView>;

/** 항성계 안에서 지금 축척(scale)에 따라 바뀌는 보기 — 오르트 구름·외곽 천체 목록. */
export function systemNavigation({ system, galaxyView, cloud, outerRegion, body, root }: ExplorerViewState, scale: ZoomScale) {
  const oortView = !galaxyView && !!cloud && scale === 'oort';
  const outerBodies = system.bodies.filter((other) => other.region === 'outer');
  const outerSelection = body?.region ? body : outerBodies.find((other) => other.id === body?.parent);
  const showOuterNavigation = outerRegion && (scale === 'outer' || scale === 'distant' || outerSelection !== undefined);
  const bodies = oortView
    ? []
    : showOuterNavigation
      ? outerBodies
      : system.bodies.filter((other) => other.parent === null || (other.parent === root.id && !other.region) || (isMultiStar(system) && other.kind === 'planet'));
  return { oortView, outerSelection, bodies };
}

export type SystemNavigation = ReturnType<typeof systemNavigation>;
