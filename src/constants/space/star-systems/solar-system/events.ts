import type { SkyEvent, Source } from '../../types';

// 시각은 UTC(분 단위). 일식·월식은 NASA GSFC 표의 최대식 TD 에서 ΔT 69초를 뺐고, 충은 JPL Horizons 의 지심 태양–행성 황경 차가 180°를 넘는 첫 분이다(최근접과는 다르다).
const SOLAR_ECLIPSES: Source = { label: 'NASA GSFC · Solar Eclipses 2021–2030', href: 'https://eclipse.gsfc.nasa.gov/SEdecade/SEdecade2021.html' };
const LUNAR_ECLIPSES: Source = { label: 'NASA GSFC · Lunar Eclipses 2021–2030', href: 'https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html' };
const HORIZONS: Source = { label: 'NASA/JPL · Horizons', href: 'https://ssd.jpl.nasa.gov/horizons/' };

export const skyEvents: readonly SkyEvent[] = [
  { kind: 'solar-eclipse', subtype: 'annular', instant: '2027-02-06T16:00:00Z', bodyId: 'earth', source: SOLAR_ECLIPSES },
  { kind: 'opposition', instant: '2027-02-11T00:29:00Z', bodyId: 'jupiter', source: HORIZONS },
  { kind: 'opposition', instant: '2027-02-19T15:51:00Z', bodyId: 'mars', source: HORIZONS },
  { kind: 'lunar-eclipse', subtype: 'penumbral', instant: '2027-02-20T23:13:00Z', bodyId: 'moon', source: LUNAR_ECLIPSES },
  { kind: 'lunar-eclipse', subtype: 'penumbral', instant: '2027-07-18T16:03:00Z', bodyId: 'moon', source: LUNAR_ECLIPSES },
  { kind: 'solar-eclipse', subtype: 'total', instant: '2027-08-02T10:07:00Z', bodyId: 'earth', source: SOLAR_ECLIPSES },
  { kind: 'lunar-eclipse', subtype: 'penumbral', instant: '2027-08-17T07:14:00Z', bodyId: 'moon', source: LUNAR_ECLIPSES },
  { kind: 'opposition', instant: '2027-10-18T00:36:00Z', bodyId: 'saturn', source: HORIZONS },
  { kind: 'lunar-eclipse', subtype: 'partial', instant: '2028-01-12T04:13:00Z', bodyId: 'moon', source: LUNAR_ECLIPSES },
  { kind: 'solar-eclipse', subtype: 'annular', instant: '2028-01-26T15:08:00Z', bodyId: 'earth', source: SOLAR_ECLIPSES },
  { kind: 'opposition', instant: '2028-03-12T15:37:00Z', bodyId: 'jupiter', source: HORIZONS },
  { kind: 'lunar-eclipse', subtype: 'partial', instant: '2028-07-06T18:20:00Z', bodyId: 'moon', source: LUNAR_ECLIPSES },
  { kind: 'solar-eclipse', subtype: 'total', instant: '2028-07-22T02:56:00Z', bodyId: 'earth', source: SOLAR_ECLIPSES },
  { kind: 'opposition', instant: '2028-10-30T17:34:00Z', bodyId: 'saturn', source: HORIZONS },
  { kind: 'lunar-eclipse', subtype: 'total', instant: '2028-12-31T16:52:00Z', bodyId: 'moon', source: LUNAR_ECLIPSES },
  { kind: 'solar-eclipse', subtype: 'partial', instant: '2029-01-14T17:13:00Z', bodyId: 'earth', source: SOLAR_ECLIPSES },
  { kind: 'opposition', instant: '2029-03-25T07:50:00Z', bodyId: 'mars', source: HORIZONS },
  { kind: 'opposition', instant: '2029-04-12T04:05:00Z', bodyId: 'jupiter', source: HORIZONS },
  { kind: 'solar-eclipse', subtype: 'partial', instant: '2029-06-12T04:05:00Z', bodyId: 'earth', source: SOLAR_ECLIPSES },
  { kind: 'lunar-eclipse', subtype: 'total', instant: '2029-06-26T03:22:00Z', bodyId: 'moon', source: LUNAR_ECLIPSES },
  { kind: 'solar-eclipse', subtype: 'partial', instant: '2029-07-11T15:36:00Z', bodyId: 'earth', source: SOLAR_ECLIPSES },
  { kind: 'opposition', instant: '2029-11-13T15:01:00Z', bodyId: 'saturn', source: HORIZONS },
  { kind: 'solar-eclipse', subtype: 'partial', instant: '2029-12-05T15:03:00Z', bodyId: 'earth', source: SOLAR_ECLIPSES },
  { kind: 'lunar-eclipse', subtype: 'total', instant: '2029-12-20T22:42:00Z', bodyId: 'moon', source: LUNAR_ECLIPSES },
  { kind: 'opposition', instant: '2030-05-13T11:34:00Z', bodyId: 'jupiter', source: HORIZONS },
  { kind: 'solar-eclipse', subtype: 'annular', instant: '2030-06-01T06:28:00Z', bodyId: 'earth', source: SOLAR_ECLIPSES },
  { kind: 'lunar-eclipse', subtype: 'partial', instant: '2030-06-15T18:33:00Z', bodyId: 'moon', source: LUNAR_ECLIPSES },
  { kind: 'solar-eclipse', subtype: 'total', instant: '2030-11-25T06:50:00Z', bodyId: 'earth', source: SOLAR_ECLIPSES },
  { kind: 'opposition', instant: '2030-11-27T15:56:00Z', bodyId: 'saturn', source: HORIZONS },
  { kind: 'lunar-eclipse', subtype: 'penumbral', instant: '2030-12-09T22:28:00Z', bodyId: 'moon', source: LUNAR_ECLIPSES },
];
