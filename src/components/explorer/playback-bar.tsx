import { useLanguage } from '@/i18n/language';
import { milkyWay, type Body, type StarSystem } from '@/constants/space';
import type { RefObject } from 'react';
import { ComparisonDistance } from '../details';
import { REALTIME_DAYS_PER_SECOND } from '../utils/orbit';
import type { DistanceStore } from '../utils/distance-store';
import type { Playback } from './hooks';
import { LightTravel } from './light-travel';
import { SimulationClock } from './simulation-clock';
import { Tour } from './tour';
import type { ExplorerViewState } from './view-state';
import styles from '../explore.module.scss';

/** 재생·속도, 은하 공전 시연, 안내 문구, 화면 거리 축척, 태양계 천체 사이 거리 비교. */
export function PlaybackBar({
  view,
  playback,
  clock,
  light,
  pathname,
  currentPath,
  distanceBar,
  comparison,
  navigateSpace,
}: {
  view: ExplorerViewState;
  playback: Playback;
  clock: { simulationDaysRef: RefObject<number>; startedAt: number; serverOffset: number; onJump: (ms: number) => void; onNow: () => void };
  light?: { system: StarSystem; startDays: number | null; simulationDaysRef: RefObject<number>; onToggle: () => void };
  pathname: string;
  currentPath: string;
  distanceBar: RefObject<HTMLDivElement | null>;
  navigateSpace: (url: string) => void;
  comparison?: { active: boolean; onToggle: () => void; store: DistanceStore; origin?: Body; destination?: Body };
}) {
  const { t, measurement } = useLanguage();
  const { paused, setPaused, galacticDemo, setGalacticDemo, speed, setSpeed } = playback;
  const { featuredObject, neighborhoodView, galaxyView, focusBlackHole, animatedAccretion, animatedFeaturedVolume, distantObject, cosmicView, extraView, system } = view;
  const fixedLayout =
    !animatedAccretion &&
    !animatedFeaturedVolume &&
    (distantObject || cosmicView || extraView || neighborhoodView || (featuredObject && !featuredObject.spinSeconds && !featuredObject.variabilityDays && !featuredObject.expansionPerYear));
  const showScale = !focusBlackHole && (!distantObject || distantObject.observationScale) && (!featuredObject || (featuredObject.extentLightYears > 0 && featuredObject.kind !== 'black-hole'));
  const showGalacticDemo = !featuredObject && !neighborhoodView && galaxyView && !focusBlackHole;
  const direction = speed < 0 ? -1 : 1;
  return (
    <div className={styles.playback}>
      <div className={styles.transport}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={paused ? t('playback.resume') : t('playback.pause')}
          title={paused ? t('playback.resume') : t('playback.pause')}
          onClick={() => setPaused((wasPaused) => !wasPaused)}
        >
          <span aria-hidden="true">{paused ? '▶' : '❚❚'}</span>
        </button>
        <label className={styles.speed}>
          <span>{t('playback.speed')}</span>
          <select value={Math.abs(speed)} onChange={(event) => setSpeed(direction * Number(event.target.value))}>
            <option value={REALTIME_DAYS_PER_SECOND / 60}>{t('playback.slowMotion')}</option>
            <option value={REALTIME_DAYS_PER_SECOND}>{t('playback.realTime')}</option>
            <option value={REALTIME_DAYS_PER_SECOND * 60}>{t('playback.oneMinute')}</option>
            <option value={REALTIME_DAYS_PER_SECOND * 600}>{t('playback.tenMinutes')}</option>
            <option value={REALTIME_DAYS_PER_SECOND * 3600}>{t('playback.oneHour')}</option>
            <option value={1}>{t('playback.oneDay')}</option>
            <option value={5}>{t('playback.fiveDays')}</option>
            <option value={50}>{t('playback.fiftyDays')}</option>
            <option value={500}>{t('playback.fiveHundredDays')}</option>
          </select>
        </label>
        <button type="button" aria-pressed={direction < 0} title={t('playback.reverseHint')} onClick={() => setSpeed((current) => -current)}>
          {t('playback.reverse')}
        </button>
      </div>
      <SimulationClock {...clock} />
      <div className={styles.tools}>
        <Tour currentPath={currentPath} navigateSpace={navigateSpace} />
        {light && <LightTravel key={light.startDays ?? 'off'} {...light} />}
        {comparison && (
          <button type="button" aria-pressed={comparison.active} onClick={comparison.onToggle}>
            {t('details.compareDistance')}
          </button>
        )}
        {showGalacticDemo && (
          <button type="button" aria-pressed={galacticDemo} onClick={() => setGalacticDemo((playing) => !playing)}>
            {galacticDemo ? t('playback.stopGalacticDemo') : t('playback.startGalacticDemo')}
          </button>
        )}
      </div>
      {comparison?.active && comparison.origin && <ComparisonDistance store={comparison.store} origin={comparison.origin} destination={comparison.destination} />}
      {showGalacticDemo && galacticDemo && <p className={styles.hint}>{t('playback.galacticDemoSpeed', [measurement(milkyWay.demoYearsPerSecond)])}</p>}
      {showScale && (
        <div
          key={distantObject?.id ?? featuredObject?.id ?? (extraView ? pathname : neighborhoodView ? 'neighborhood' : galaxyView ? 'galaxy' : system.id)}
          ref={distanceBar}
          className={styles.distanceBar}
          role="group"
          aria-label={t('navigation.distanceScale')}
          title={t('navigation.scaleHint')}
        />
      )}
      <p className={styles.hint}>
        {fixedLayout && `${t('playback.fixedLayout')} `}
        {t('navigation.cameraInstructions')}
      </p>
    </div>
  );
}
