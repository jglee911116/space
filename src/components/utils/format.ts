import type { Body, DistantObject, StarSystem } from '@/constants/space';
import type { CatalogText, FormatNumber, MessageKey, Translator } from '@/i18n/messages';
import { DAYS_PER_YEAR, KM_PER_AU, KM_PER_LIGHT_DAY } from '@/constants/space/units';

const KM_PER_LIGHT_SECOND = KM_PER_LIGHT_DAY / 86_400;

/** 별빛이 이 천체(위성이면 그 모행성)까지 오는 시간(초) — 별을 도는 궤도의 장반경, 곧 평균 거리 기준. */
export function starlightSeconds(system: StarSystem, body: Body) {
  for (let current = body; current.parent; ) {
    const parent = system.bodies.find((other) => other.id === current.parent);
    if (!parent) return null;
    // 탈출 궤적은 자료 기준 시점의 거리.
    const au = current.orbit?.axisAu ?? (current.trajectory && Math.hypot(...current.trajectory.positionAu));
    if (parent.kind === 'star') return au === undefined ? null : (au * KM_PER_AU) / KM_PER_LIGHT_SECOND;
    current = parent;
  }
  return null;
}

/** 초 → '8분 19초' · '4시간 10분' · '1.2일'. */
export function formatDuration(seconds: number, t: Translator, number: FormatNumber) {
  if (seconds < 3_600) return t('units.minutesSeconds', [Math.floor(seconds / 60), Math.round(seconds % 60)]);
  if (seconds < 2 * 86_400) return t('units.hoursMinutes', [Math.floor(seconds / 3_600), Math.round((seconds % 3_600) / 60)]);
  return t('units.days', [number(seconds / 86_400, 1)]);
}

// 종류 → 문구 표. 종류를 추가하고 여기를 빠뜨리면 typecheck 가 잡는다(정보 패널과 검색이 함께 쓴다).
export const kindLabel = {
  star: 'body.star',
  planet: 'body.planet',
  'dwarf-planet': 'body.dwarfPlanet',
  'small-body': 'body.smallBody',
  moon: 'body.moon',
  spacecraft: 'body.spacecraft',
} as const satisfies Record<Body['kind'], MessageKey>;

export const distantKindLabel = {
  quasar: 'details.quasar',
  'early-galaxy': 'details.earlyGalaxy',
  'ring-galaxy': 'details.ringGalaxy',
  'galaxy-group': 'details.galaxyGroup',
  'galaxy-cluster': 'details.galaxyCluster',
  'galaxy-merger': 'details.galaxyMerger',
} as const satisfies Record<DistantObject['kind'], MessageKey>;

export function bodySize(body: Body, t: Translator, number: FormatNumber) {
  const value = body.lengthKm ?? body.radiusKm;
  if (value === undefined) return null;
  return { label: t(body.lengthKm ? 'details.maximumLength' : 'details.radius'), value: `${number(value, value < 20 ? 1 : 0)} km` };
}

export function formatSpin(body: Body, t: Translator, number: FormatNumber, catalogText: (value: CatalogText) => string) {
  if (body.spinNote) return catalogText(body.spinNote);
  const days = body.spinDays;
  if (days === undefined) return t('details.unknown');
  return (days < 2 ? t('units.hours', [number(days * 24)]) : t('units.days', [number(days)])) + (body.tilt > 90 ? ` · ${t('details.retrograde')}` : '');
}

export function formatPeriod(body: Body, t: Translator, number: FormatNumber) {
  const days = body.orbit!.periodDays;
  return body.kind === 'star' && days >= DAYS_PER_YEAR ? t('units.years', [number(days / DAYS_PER_YEAR)]) : t('units.days', [number(days, 2)]);
}

export function formatAxis(body: Body, parent: Body | undefined, number: FormatNumber) {
  const axisAu = body.orbit!.axisAu;
  return !parent || parent.kind === 'star' ? `${number(axisAu, 5)} AU` : `${number(axisAu * KM_PER_AU, 0)} km`;
}
