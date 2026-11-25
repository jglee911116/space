import { useLanguage } from '@/i18n/language';
import { milkyWay, type Body } from '@/constants/space';
import type { RefObject } from 'react';
import { ComparisonDistance } from '../details';
import { REALTIME_DAYS_PER_SECOND } from '../utils/orbit';
import type { DistanceStore } from '../utils/distance-store';
import type { Playback } from './hooks';
import type { ExplorerViewState } from './view-state';
import styles from '../explore.module.scss';

/** 재생·속도, 은하 공전 시연, 안내 문구, 화면 거리 축척, 태양계 천체 사이 거리 비교. */
export function PlaybackBar({
  view,
  playback,
  pathname,
  distanceBar,
  comparison,
}: {
  view: ExplorerViewState;
  playback: Playback;
  pathname: string;
  distanceBar: RefObject<HTMLDivElement | null>;
  comparison?: { active: boolean; onToggle: () => void; store: DistanceStore; origin?: Body; destination?: Body };
}) {
  const { t, measurement } = useLanguage();
  const { paused, setPaused, galacticDemo, setGalacticDemo, daysPerSecond, setDaysPerSecond } = playback;
  const { featuredObject, neighborhoodView, galaxyView, focusBlackHole, animatedAccretion, animatedFeaturedVolume, distantObject, cosmicView, extraView, system } = view;
  const fixedLayout =
    !animatedAccretion &&
    !animatedFeaturedVolume &&
    (distantObject || cosmicView || extraView || neighborhoodView || (featuredObject && !featuredObject.spinSeconds && !featuredObject.variabilityDays && !featuredObject.expansionPerYear));
  const showScale = !focusBlackHole && (!distantObject || distantObject.observationScale) && (!featuredObject || (featuredObject.extentLightYears > 0 && featuredObject.kind !== 'black-hole'));
  return (
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
          {galacticDemo && <p className={styles.hint}>{t('playback.galacticDemoSpeed', [measurement(milkyWay.demoYearsPerSecond)])}</p>}
        </>
      )}
      {fixedLayout && <p className={styles.hint}>{t('playback.fixedLayout')}</p>}
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
      <p className={styles.hint}>{t('navigation.cameraInstructions')}</p>
      {comparison && (
        <div className={styles.distanceComparison}>
          <button type="button" aria-pressed={comparison.active} onClick={comparison.onToggle}>
            {t('details.compareDistance')}
          </button>
          {comparison.active && comparison.origin && <ComparisonDistance store={comparison.store} origin={comparison.origin} destination={comparison.destination} />}
        </div>
      )}
    </div>
  );
}
