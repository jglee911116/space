import { useLanguage } from '@/i18n/language';
import { languages } from '@/i18n/messages';
import type { SkyEvent, StarSystem } from '@/constants/space';
import { useEffect, useMemo, useState } from 'react';
import styles from './explore.module.scss';

const SHOWN = 5;
const kindKey = { 'solar-eclipse': 'events.solarEclipse', 'lunar-eclipse': 'events.lunarEclipse', opposition: 'events.opposition' } as const satisfies Record<SkyEvent['kind'], string>;
const subtypeKey = { total: 'events.total', annular: 'events.annular', partial: 'events.partial', penumbral: 'events.penumbral' } as const satisfies Record<NonNullable<SkyEvent['subtype']>, string>;

export type SkyEventClock = { readMs: () => number; onJump: (ms: number, bodyId: string) => void };

/** 시뮬레이션 시각 이후의 천문 현상 — 누르면 그 순간으로 건너뛰고 해당 천체를 비춘다. */
export function SkyEvents({ system, clock }: { system: StarSystem; clock: SkyEventClock }) {
  const { t, catalogText, locale } = useLanguage();
  const [now, setNow] = useState(clock.readMs);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(clock.readMs()), 1000);
    return () => window.clearInterval(timer);
  }, [clock]);
  const format = useMemo(() => new Intl.DateTimeFormat(languages[locale].intl, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }), [locale]);
  // 방금 건너뛴 현상도 남도록 1분 여유를 둔다.
  const upcoming = (system.events ?? []).filter((event) => Date.parse(event.instant) >= now - 60_000).slice(0, SHOWN);
  return (
    <section className={styles.skyEvents} aria-labelledby="sky-events">
      <h3 id="sky-events">{t('events.title')}</h3>
      {upcoming.length === 0 ? (
        <p>{t('events.none')}</p>
      ) : (
        <ul>
          {upcoming.map((event) => {
            const ms = Date.parse(event.instant);
            const body = system.bodies.find(({ id }) => id === event.bodyId)!;
            return (
              <li key={`${event.kind}:${event.instant}`}>
                <button type="button" onClick={() => clock.onJump(ms, event.bodyId)}>
                  {t(kindKey[event.kind], [event.subtype ? t(subtypeKey[event.subtype]) : catalogText(body.name)])}
                </button>{' '}
                <time dateTime={event.instant}>{format.format(ms)} UTC</time> <a href={event.source.href}>{catalogText(event.source.label)}</a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
