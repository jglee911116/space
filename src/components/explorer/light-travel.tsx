import { useLanguage } from '@/i18n/language';
import type { StarSystem } from '@/constants/space';
import { useEffect, useMemo, useState, type RefObject } from 'react';
import { formatDuration, starlightSeconds } from '../utils/format';
import { isSatellite } from '../utils/orbit';
import styles from '../explore.module.scss';

/** 별에서 빛을 출발시켜, 시뮬레이션 시간으로 얼마나 지났고 어느 천체까지 닿았는지 보여 준다(구면은 장면이 그린다). */
export function LightTravel({
  system,
  epochDays,
  startDays,
  simulationDaysRef,
  onToggle,
}: {
  system: StarSystem;
  epochDays: number;
  startDays: number | null;
  simulationDaysRef: RefObject<number>;
  onToggle: () => void;
}) {
  const { t, catalogText, number } = useLanguage();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (startDays === null) return;
    const timer = window.setInterval(() => setElapsedSeconds(Math.max(0, (simulationDaysRef.current - startDays) * 86_400)), 250);
    return () => window.clearInterval(timer);
  }, [simulationDaysRef, startDays]);
  // 별을 직접 도는 천체를 빛이 닿는 순서로(행성을 도는 위성·망원경은 행성과 같은 때 닿는다).
  const stops = useMemo(
    () =>
      system.bodies
        .filter((body) => body.kind !== 'star' && !isSatellite(system, body))
        .flatMap((body) => {
          // 탐사선은 빛이 출발한 순간(시뮬레이션 날짜)의 거리로 잰다 — 빛이 가는 몇 시간 동안의 이동은 무시한다.
          const seconds = starlightSeconds(system, body, epochDays + (startDays ?? 0));
          return seconds === null ? [] : [{ body, seconds }];
        })
        .sort((a, b) => a.seconds - b.seconds),
    [epochDays, startDays, system],
  );
  const reached = stops.filter(({ seconds }) => seconds <= elapsedSeconds).at(-1);
  return (
    <div className={styles.lightTravel}>
      <button type="button" aria-pressed={startDays !== null} onClick={onToggle}>
        {startDays === null ? t('playback.startLight') : t('playback.stopLight')}
      </button>
      {startDays !== null && (
        <span role="status">
          {t('playback.lightElapsed', [formatDuration(elapsedSeconds, t, number)])}
          {reached && ` · ${t('playback.lightReached', [catalogText(reached.body.name)])}`}
        </span>
      )}
    </div>
  );
}
