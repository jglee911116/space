import { message } from '@/i18n/messages';
import type { Body, Source } from '../../types';

// 위치·속도는 JPL Horizons 의 2026-01-01 TDB 일심 황도(J2000) 벡터. 태양 중력이 거의 미치지 않아 등속 외삽의 5년 오차는 0.1 AU 미만이다.
const HORIZONS: Source = { label: 'NASA/JPL · Horizons', href: 'https://ssd.jpl.nasa.gov/horizons/' };
const EPOCH = '2026-01-01T00:00:00Z';

export const spacecraft: readonly Body[] = [
  {
    id: 'voyager-1',
    name: message('catalog.spacecraft.voyager-1.name'),
    kind: 'spacecraft',
    parent: 'sun',
    region: 'outer',
    tilt: 0,
    displayRadius: 0.08,
    colors: ['#6f6a5e', '#c9c1ad', '#f2ead6'],
    trajectory: { epoch: EPOCH, positionAu: [-31.8364, -134.6785, 97.4448], velocityAuPerDay: [-1.197152e-3, -7.861078e-3, 5.680006e-3] },
    note: message('catalog.spacecraft.voyager-1.note'),
    sources: [HORIZONS, { label: 'NASA · Voyager', href: 'https://science.nasa.gov/mission/voyager/' }],
  },
  {
    id: 'voyager-2',
    name: message('catalog.spacecraft.voyager-2.name'),
    kind: 'spacecraft',
    parent: 'sun',
    region: 'outer',
    tilt: 0,
    displayRadius: 0.08,
    colors: ['#6f6a5e', '#c9c1ad', '#f2ead6'],
    trajectory: { epoch: EPOCH, positionAu: [39.2275, -103.9915, -87.9187], velocityAuPerDay: [2.427683e-3, -5.395072e-3, -6.53842e-3] },
    note: message('catalog.spacecraft.voyager-2.note'),
    sources: [HORIZONS, { label: 'NASA · Voyager', href: 'https://science.nasa.gov/mission/voyager/' }],
  },
  {
    id: 'new-horizons',
    name: message('catalog.spacecraft.new-horizons.name'),
    kind: 'spacecraft',
    parent: 'sun',
    region: 'outer',
    tilt: 0,
    displayRadius: 0.08,
    colors: ['#6b5f4a', '#c7b48c', '#f0dfb8'],
    trajectory: { epoch: EPOCH, positionAu: [20.0096, -60.3045, 2.2129], velocityAuPerDay: [3.070495e-3, -7.229268e-3, 2.845557e-4] },
    note: message('catalog.spacecraft.new-horizons.note'),
    sources: [HORIZONS, { label: 'NASA · New Horizons', href: 'https://science.nasa.gov/mission/new-horizons/' }],
  },
  {
    // L2 헤일로 궤도 대신, 지구에서 늘 태양 반대쪽 약 150만 km 에 두는 단순 모형(지구와 같은 주기·평균 황경).
    id: 'jwst',
    name: message('catalog.spacecraft.jwst.name'),
    aliases: ['JWST', 'Webb'],
    kind: 'spacecraft',
    parent: 'earth',
    tilt: 0,
    displayRadius: 0.012,
    colors: ['#6e5a2a', '#d8b25a', '#ffe08a'],
    orbit: { axisAu: 0.01, eccentricity: 0, inclination: 0, meanLongitude: 100.46457166, perihelionLongitude: 0, ascendingNode: 0, periodDays: 365.256 },
    note: message('catalog.spacecraft.jwst.note'),
    sources: [{ label: 'NASA · Webb Orbit', href: 'https://science.nasa.gov/mission/webb/orbit/' }],
  },
];
