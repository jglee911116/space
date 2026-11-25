import { useLanguage } from '@/i18n/language';
import { distantObjects, galaxies, galaxyAssociations, localGroup, milkyWay, observableUniverse, superclusters, systems, type Galaxy, type StarSystem } from '@/constants/space';
import { SITE_NAME_KEY } from '@/constants/site';
import { CatalogSearch } from '../catalog-search';
import { LanguageSelect } from '../language-select';
import { isNearbySystem } from '../utils/nearby-positions';
import { localGroupPath } from '../utils/paths';
import type { Target } from '../scenes/system-scene';
import type { ZoomHandoff, ZoomScale } from '../utils/zoom';
import { DEFAULT_SYSTEM_ID, type ExplorerViewState, type RecordedView, type SystemNavigation } from './view-state';
import styles from '../explore.module.scss';

export type HeaderActions = {
  navigateSpace: (url: string, entry?: ZoomHandoff) => void;
  navigateTo: (next: Target, nextOverview?: RecordedView) => void;
  selectSystem: (id: string) => void;
  selectSystemBody: (next: Target) => void;
  enterExternalGalaxy: (item: Galaxy) => void;
  enterLocalGroup: () => void;
  enterUniverse: () => void;
  enterRegion: (id: string) => void;
  enterAssociation: (id: string) => void;
  selectDistantObject: (id: string) => void;
  selectFeaturedObject: (id: string) => void;
  focusNearbySystem: (item: StarSystem) => void;
  selectGalacticCenter: () => void;
};

/** 사이트 이름·현재 위치, 찾기(빠른 이동·전체 목록) 패널과 언어 선택. */
export function ExplorerHeader({
  view,
  nav,
  scale,
  locationLabel,
  currentPath,
  actions,
}: {
  view: ExplorerViewState;
  nav: SystemNavigation;
  scale: ZoomScale;
  locationLabel: string;
  currentPath: string;
  actions: HeaderActions;
}) {
  const { t, catalogText } = useLanguage();
  const {
    cosmicView,
    groupView,
    externalGalaxy,
    neighborhoodView,
    galaxyView,
    focusGalacticCenter,
    focusBlackHole,
    activeGalaxy,
    universeView,
    distantObject,
    region,
    association,
    extraView,
    galaxyObjects,
    featuredObject,
    galaxySystems,
    galaxyAnchor,
    system,
    target,
    overview,
    outerRegion,
    cloud,
    hasGalaxy,
    body,
    root,
  } = view;
  const { oortView, outerSelection, bodies } = nav;
  const quickLinks = [
    ...(!cosmicView && !groupView && !externalGalaxy && !neighborhoodView ? [{ label: catalogText(milkyWay.neighborhood.name), onSelect: () => actions.navigateTo(null, 'neighborhood') }] : []),
    ...(!cosmicView && !groupView && !externalGalaxy && (galaxyView || neighborhoodView || system.id !== DEFAULT_SYSTEM_ID || target !== null)
      ? [{ label: catalogText(galaxyAnchor?.name ?? systems[0].name), onSelect: () => actions.selectSystem(DEFAULT_SYSTEM_ID) }]
      : []),
    ...(!galaxyView || focusGalacticCenter || activeGalaxy.id !== milkyWay.id ? [{ label: catalogText(milkyWay.name), onSelect: () => actions.enterExternalGalaxy(milkyWay) }] : []),
    ...(!groupView ? [{ label: catalogText(localGroup.name), onSelect: () => actions.enterLocalGroup() }] : []),
    ...(!universeView || distantObject ? [{ label: catalogText(observableUniverse.name), onSelect: () => actions.enterUniverse() }] : []),
  ].slice(0, 4);

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <h1>{t(SITE_NAME_KEY)}</h1>
        <p className={styles.currentLocation} aria-live="polite" aria-atomic="true">
          {locationLabel}
        </p>
      </div>
      <div className={styles.headerActions}>
        <CatalogSearch systems={systems} onSelect={actions.navigateSpace} currentPath={currentPath} currentName={locationLabel} quickLinks={quickLinks}>
          <div className={styles.controls} role="group" aria-label={t('navigation.galacticScales')}>
            <h2>{t('navigation.galacticScales')}</h2>
            <button type="button" aria-pressed={universeView && !distantObject} onClick={() => actions.enterUniverse()}>
              {catalogText(observableUniverse.name)}
            </button>
            {superclusters.map((item) => (
              <button key={item.id} type="button" aria-pressed={item === region && !association} onClick={() => actions.enterRegion(item.id)}>
                {catalogText(item.name)}
              </button>
            ))}
            {galaxyAssociations.map((item) => (
              <button key={item.id} type="button" aria-pressed={association === item} onClick={() => actions.enterAssociation(item.id)}>
                {catalogText(item.name)}
              </button>
            ))}
            <button type="button" aria-pressed={groupView} onClick={() => actions.enterLocalGroup()}>
              {catalogText(localGroup.name)}
            </button>
            {galaxies.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={!cosmicView && !groupView && (extraView || galaxyView) && activeGalaxy.id === item.id}
                onClick={() => actions.enterExternalGalaxy(item)}
              >
                {catalogText(item.name)}
              </button>
            ))}
          </div>
          {universeView && (
            <div className={styles.controls} role="group" aria-label={t('navigation.distantObjects')}>
              <h2>{t('navigation.distantObjects')}</h2>
              {distantObjects.map((item) => (
                <button key={item.id} type="button" aria-pressed={distantObject?.id === item.id} onClick={() => actions.selectDistantObject(item.id)}>
                  {catalogText(item.name)}
                </button>
              ))}
            </div>
          )}
          {groupView && (
            <div className={styles.controls} role="group" aria-label={t('navigation.scrollTargets')}>
              <h2>{t('navigation.scrollTargets')}</h2>
              {localGroup.galaxies.map((item) => (
                <button key={item.id} type="button" aria-pressed={activeGalaxy.id === item.id} onClick={() => actions.navigateSpace(localGroupPath(item.id))}>
                  {t('navigation.focusOn', [catalogText(item.name)])}
                </button>
              ))}
            </div>
          )}
          {!cosmicView && !groupView && galaxyObjects.length > 0 && (
            <div className={styles.controls} role="group" aria-label={t('navigation.featuredObjects')}>
              <h2>{t('navigation.featuredObjects')}</h2>
              {galaxyObjects.map((item) => (
                <button key={item.id} type="button" aria-pressed={featuredObject?.id === item.id} onClick={() => actions.selectFeaturedObject(item.id)}>
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
                  <button key={item.id} type="button" onClick={() => actions.enterExternalGalaxy(item)}>
                    {catalogText(item.name)}
                  </button>
                ))}
            </div>
          )}
          {!cosmicView && !groupView && galaxySystems.length > 0 && (
            <div className={styles.controls} role="group" aria-label={t('navigation.selectStarSystem')}>
              <h2>{t('navigation.starSystems')}</h2>
              {!externalGalaxy && (
                <button type="button" aria-pressed={neighborhoodView} onClick={() => actions.navigateTo(null, 'neighborhood')}>
                  {catalogText(milkyWay.neighborhood.name)}
                </button>
              )}
              {galaxySystems.map((item) => (
                <button key={item.id} type="button" aria-pressed={!extraView && !neighborhoodView && item === system} onClick={() => actions.selectSystem(item.id)}>
                  {catalogText(item.name)}
                </button>
              ))}
            </div>
          )}
          {!featuredObject && !neighborhoodView && !extraView && (
            <div className={styles.controls} role="group" aria-label={t('navigation.cameraViews')}>
              <h2>{t('navigation.currentView')}</h2>
              <button type="button" aria-pressed={!galaxyView && target === null && scale === 'system' && overview !== 'distant'} onClick={() => actions.navigateTo(null)}>
                {catalogText(system.overviewLabel ?? 'navigation.planetarySystem')}
              </button>
              {system.wideOverview && (
                <button type="button" aria-pressed={target === null && overview === 'distant'} onClick={() => actions.navigateTo(null, 'distant')}>
                  {catalogText(system.wideOverview.label)}
                </button>
              )}
              {outerRegion && (
                <button
                  type="button"
                  aria-pressed={!galaxyView && (scale === 'outer' || scale === 'distant' || (!oortView && outerSelection !== undefined))}
                  onClick={() => actions.navigateTo(null, 'outer')}
                >
                  {catalogText(outerRegion.name)}
                </button>
              )}
              {cloud && (
                <button type="button" aria-pressed={oortView} onClick={() => actions.navigateTo(null, 'oort')}>
                  {t('navigation.oortCloud')}
                </button>
              )}
              {hasGalaxy && (
                <button type="button" aria-pressed={galaxyView && !focusGalacticCenter && !body} onClick={() => actions.navigateTo(null, 'galaxy')}>
                  {t('navigation.entireGalaxy')}
                </button>
              )}
              {galaxyView ? (
                <>
                  {galaxySystems.filter(isNearbySystem).map((item) => (
                    <button key={item.id} type="button" aria-pressed={item === system && body === root} onClick={() => actions.focusNearbySystem(item)}>
                      {t('navigation.around', [catalogText(item.name)])}
                    </button>
                  ))}
                  <button type="button" aria-pressed={focusBlackHole} onClick={actions.selectGalacticCenter}>
                    {catalogText(milkyWay.center.name)}
                  </button>
                </>
              ) : (
                bodies.map((item) => (
                  <button key={item.id} type="button" aria-pressed={target === item.id || (item !== root && body?.parent === item.id)} onClick={() => actions.selectSystemBody(item.id)}>
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
  );
}
