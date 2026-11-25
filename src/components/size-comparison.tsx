import { useLanguage } from '@/i18n/language';
import { systems, type Body } from '@/constants/space';
import { useId, useState } from 'react';
import styles from './explore.module.scss';

// 비구형 천체는 최대 길이의 절반을 반지름으로 본다.
const radiusOf = (body: Body) => (body.lengthKm === undefined ? body.radiusKm : body.lengthKm / 2);
const key = (systemId: string, bodyId: string) => `${systemId}:${bodyId}`;
const candidates = new Map(systems.flatMap((system) => system.bodies.flatMap((body) => (radiusOf(body) === undefined ? [] : [[key(system.id, body.id), body] as const]))));

/** 고른 천체와 다른 천체 둘까지를 같은 축척의 원으로 나란히 그린다. */
export function SizeComparison({ systemId, body }: { systemId: string; body: Body }) {
  const { t, catalogText, number } = useLanguage();
  const id = useId();
  const [others, setOthers] = useState<[string, string]>(['', '']);
  const radius = radiusOf(body);
  if (radius === undefined) return null;
  const shown = [body, ...others.flatMap((value) => (candidates.has(value) ? [candidates.get(value)!] : []))];
  const largest = Math.max(...shown.map((item) => radiusOf(item)!));
  const width = 100 * shown.length;
  return (
    <details className={styles.sizeComparison}>
      <summary>{t('details.compareSize')}</summary>
      {others.map((value, index) => (
        <label key={index}>
          <span>{t('details.compareWith', [String(index + 1)])}</span>
          <select id={`${id}-${index}`} value={value} onChange={(event) => setOthers((current) => (index === 0 ? [event.target.value, current[1]] : [current[0], event.target.value]))}>
            <option value="">{t('details.compareNone')}</option>
            {systems.map((system) => (
              <optgroup key={system.id} label={catalogText(system.name)}>
                {system.bodies.map((other) =>
                  candidates.has(key(system.id, other.id)) && key(system.id, other.id) !== key(systemId, body.id) ? (
                    <option key={other.id} value={key(system.id, other.id)}>
                      {catalogText(other.name)}
                    </option>
                  ) : null,
                )}
              </optgroup>
            ))}
          </select>
        </label>
      ))}
      <svg viewBox={`0 0 ${width} 120`} role="img" aria-label={t('details.compareSize')}>
        {shown.map((item, index) => {
          const r = Math.max(0.6, (radiusOf(item)! / largest) * 45);
          return (
            <g key={index}>
              <circle cx={50 + index * 100} cy={50} r={r} fill={item.colors[2]} />
              <text x={50 + index * 100} y={112} textAnchor="middle">
                {catalogText(item.name)} · {number(radiusOf(item)! / radius, 2)}×
              </text>
            </g>
          );
        })}
      </svg>
    </details>
  );
}
