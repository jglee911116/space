import { message } from '@/i18n/messages';
import type { Body, StarSystem } from '../../types';
import { SOLAR_LUMINOSITY_W, SOLAR_RADIUS_KM } from '../../units';

const ARCHIVE = { label: 'NASA Exoplanet Archive · Ross 128', href: 'https://exoplanetarchive.ipac.caltech.edu/overview/ROSS_128%20b' };
const DISCOVERY = { label: message('catalog.ross-128.discovery.source.bonfils-et-al-discovery-of-ross-128'), href: 'https://doi.org/10.1051/0004-6361/201731973' };
const star: Body = {
  id: 'ross-128-star',
  name: message('catalog.ross-128.ross-128-star.name'),
  kind: 'star',
  parent: null,
  radiusKm: Math.round(0.1967 * SOLAR_RADIUS_KM),
  displayRadius: 0.16,
  tilt: 0,
  colors: ['#721c17', '#ed7549', '#ffab85'],
  mass: message('catalog.ross-128.ross-128-star.mass'),
  stellar: { evolutionaryStage: message('catalog.stellar-stage.mainSequence'), spectralType: 'M4 V', temperatureK: 3192, luminosityWatts: 0.00362 * SOLAR_LUMINOSITY_W, emissionColor: '#ff663d', photosphere: { seed: 103, granuleScale: 133, activeRegions: 0.20 } },
  sources: [ARCHIVE, DISCOVERY],
};

export const ross128: StarSystem = {
  id: 'ross-128',
  name: message('catalog.ross-128.ross-128-star.name'),
  neighborhood: { distanceLightYears: 11.0, rightAscension: 176.93758, declination: 0.79929, source: ARCHIVE },
  overviewDistance: 1.85,
  summary: message('catalog.ross-128.ross-128.summary'),
  bodies: [
    star,
    {
      id: 'ross-128-b',
      name: message('catalog.ross-128.ross-128-b.name'),
      kind: 'planet',
      parent: star.id,
      displayRadius: 0.025,
      tilt: 0,
      colors: ['#332821', '#967b64', '#d3b394'],
      rockySurface: [271, 0.14, 0.62, 0.54],
      orbit: { axisAu: 0.0496, eccentricity: 0.116, inclination: 0, ascendingNode: 0, perihelionLongitude: 0, meanLongitude: 44, periodDays: 9.8658 },
      mass: message('catalog.ross-128.ross-128-b.mass'),
      note: message('catalog.ross-128.ross-128-b.note'),
      sources: [ARCHIVE, DISCOVERY],
    },
  ],
  sources: [ARCHIVE, DISCOVERY],
};
