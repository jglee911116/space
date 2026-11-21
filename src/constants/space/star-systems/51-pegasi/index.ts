import { message } from '@/i18n/messages';
import type { StarSystem } from '../../types';
import { SOLAR_RADIUS_KM, SOLAR_LUMINOSITY_W } from '../../units';

const ARCHIVE = { label: 'NASA Exoplanet Archive · 51 Peg', href: 'https://exoplanetarchive.ipac.caltech.edu/overview/51%20Peg' };

export const pegasi51: StarSystem = {
  id: '51-pegasi',
  name: message('catalog.51-pegasi.51-pegasi.name'),
  neighborhood: { distanceLightYears: 50.43, rightAscension: 344.36754, declination: 20.76909, source: ARCHIVE },
  overviewDistance: 1.85,
  summary: message('catalog.51-pegasi.51-pegasi.summary'),
  bodies: [
    {
      id: '51-pegasi-a',
      name: message('catalog.51-pegasi.51-pegasi-a.name'),
      kind: 'star',
      parent: null,
      radiusKm: Math.round(1.19 * SOLAR_RADIUS_KM),
      displayRadius: 0.15,
      tilt: 0,
      colors: ['#a75925', '#ffe1a2', '#ffd092'],
      stellar: {
        evolutionaryStage: message('catalog.51-pegasi.51-pegasi-a.evolutionaryStage'),
        spectralType: message('catalog.51-pegasi.51-pegasi-a.spectralType'),
        temperatureK: 5773,
        luminosityWatts: 1.19 ** 2 * SOLAR_LUMINOSITY_W,
        emissionColor: '#ffbd77',
        photosphere: { seed: 149, granuleScale: 143, activeRegions: 0.21 },
      },
      note: message('catalog.51-pegasi.51-pegasi-a.note'),
      sources: [ARCHIVE],
    },
    {
      id: '51-pegasi-b',
      name: '51 Peg b',
      kind: 'planet',
      parent: '51-pegasi-a',
      displayRadius: 0.046,
      tilt: 0,
      colors: ['#502b2d', '#b87557', '#edb77d'],
      appearance: 'bands',
      cloudBands: [23, 10, 4.6, 0.73],
      orbit: { axisAu: 0.052, eccentricity: 0, inclination: 0, ascendingNode: 0, perihelionLongitude: 0, meanLongitude: 45, periodDays: 4.2308 },
      mass: message('catalog.51-pegasi.51-pegasi-b.mass'),
      note: message('catalog.51-pegasi.51-pegasi-b.note'),
      sources: [ARCHIVE],
    },
  ],
  sources: [ARCHIVE],
};
