import { message } from '@/i18n/messages';
import type { Body, StarSystem } from '../../types';
import { SOLAR_LUMINOSITY_W, SOLAR_RADIUS_KM } from '../../units';

const ARCHIVE = { label: 'NASA Exoplanet Archive · ε Eridani', href: 'https://exoplanetarchive.ipac.caltech.edu/overview/eps%20Eri' };
const star: Body = {
  id: 'epsilon-eridani-star',
  name: message('catalog.epsilon-eridani.epsilon-eridani-star.name'),
  kind: 'star',
  parent: null,
  radiusKm: Math.round(0.77 * SOLAR_RADIUS_KM),
  displayRadius: 0.77,
  tilt: 0,
  mass: message('catalog.epsilon-eridani.epsilon-eridani-star.mass'),
  colors: ['#a23912', '#ffd198', '#ffc089'],
  stellar: {
    evolutionaryStage: message('catalog.stellar-stage.mainSequence'),
    spectralType: 'K2 V',
    temperatureK: 5146,
    luminosityWatts: 10 ** -0.47067 * SOLAR_LUMINOSITY_W,
    emissionColor: '#ff995a',
    photosphere: { seed: 97, granuleScale: 149, activeRegions: 0.55 },
  },
  sources: [ARCHIVE],
};

export const epsilonEridani: StarSystem = {
  id: 'epsilon-eridani',
  name: message('catalog.epsilon-eridani.epsilon-eridani-star.name'),
  neighborhood: { distanceLightYears: 10.45, rightAscension: 53.23258, declination: -9.45817, source: ARCHIVE },
  overviewDistance: 125,
  summary: message('catalog.epsilon-eridani.epsilon-eridani.summary'),
  bodies: [
    star,
    {
      id: 'epsilon-eridani-b',
      name: message('catalog.epsilon-eridani.epsilon-eridani-b.name'),
      kind: 'planet',
      parent: star.id,
      displayRadius: 0.32,
      tilt: 0,
      colors: ['#3c3028', '#bd8a61', '#eed0a3'],
      appearance: 'bands',
      cloudBands: [7, 28, 2.7, 0.92],
      orbit: { axisAu: 3.53, eccentricity: 0.06, inclination: 0, ascendingNode: 0, perihelionLongitude: 0, meanLongitude: 35, periodDays: 2680 },
      mass: message('catalog.epsilon-eridani.epsilon-eridani-b.mass'),
      note: message('catalog.epsilon-eridani.epsilon-eridani-b.note'),
      sources: [ARCHIVE],
    },
  ],
  sources: [ARCHIVE],
};
