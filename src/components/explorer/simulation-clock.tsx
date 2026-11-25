import { useLanguage } from '@/i18n/language';
import { languages } from '@/i18n/messages';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { MS_PER_DAY } from '../utils/orbit';
import styles from '../explore.module.scss';

// Date 가 표현할 수 있는 범위(±27만 년) — 빠른 속도로 오래 돌려도 표시가 깨지지 않게 묶는다.
const MAX_DATE_MS = 8.64e15;

/** 서버 기준 현재 시각과, 재생 속도대로 흘러간 시간을 더한 시뮬레이션 시각. */
export function SimulationClock({
  simulationDaysRef,
  startedAt,
  serverOffset,
  onJump,
  onNow,
}: {
  simulationDaysRef: RefObject<number>;
  startedAt: number;
  serverOffset: number;
  onJump: (ms: number) => void;
  onNow: () => void;
}) {
  const { t, locale } = useLanguage();
  const dateInput = useRef<HTMLInputElement>(null);
  const [times, setTimes] = useState(() => ({ server: startedAt + serverOffset, simulation: startedAt + serverOffset }));
  useEffect(() => {
    const timer = window.setInterval(() => {
      const simulation = startedAt + serverOffset + simulationDaysRef.current * MS_PER_DAY;
      setTimes({ server: Date.now() + serverOffset, simulation: Math.max(-MAX_DATE_MS, Math.min(simulation, MAX_DATE_MS)) });
    }, 250);
    return () => window.clearInterval(timer);
  }, [serverOffset, simulationDaysRef, startedAt]);
  const format = useMemo(() => new Intl.DateTimeFormat(languages[locale].intl, { dateStyle: 'medium', timeStyle: 'medium' }), [locale]);
  // 평소에는 시뮬레이션 시각 한 줄만, 펼치면 서버 시각과 날짜 이동.
  return (
    <details className={styles.clock}>
      <summary>
        <span>{t('playback.simulationTime')}</span> <time dateTime={new Date(times.simulation).toISOString()}>{format.format(times.simulation)}</time>
      </summary>
      <div className={styles.clockBody}>
        <p>
          <span>{t('playback.serverTime')}</span> <time dateTime={new Date(times.server).toISOString()}>{format.format(times.server)}</time>
        </p>
        <div className={styles.clockJump}>
          <label>
            <span>{t('playback.goToDate')}</span>
            <input
              ref={dateInput}
              type="datetime-local"
              onChange={(event) => {
                // 입력이 다 채워졌을 때만 값이 생긴다 — 이 브라우저의 지역 시각으로 읽는다.
                const ms = new Date(event.currentTarget.value).getTime();
                if (Number.isFinite(ms)) onJump(ms);
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              // 같은 날짜를 다시 골라도 이동하도록 입력을 비운다.
              if (dateInput.current) dateInput.current.value = '';
              onNow();
            }}
          >
            {t('playback.now')}
          </button>
        </div>
      </div>
    </details>
  );
}
