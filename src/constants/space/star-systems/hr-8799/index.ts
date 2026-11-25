import { message } from '@/i18n/messages';
import type { Body, StarSystem } from '../../types';
import { EARTH_RADIUS_KM, LIGHT_YEARS_PER_KPC, SOLAR_LUMINOSITY_W, SOLAR_RADIUS_KM, SOLAR_TEMPERATURE_K } from '../../units';

const ARCHIVE = { label: 'NASA Exoplanet Archive · HR 8799', href: 'https://exoplanetarchive.ipac.caltech.edu/overview/HR%208799' };
const WEBB = {
  label: 'NASA, ESA, CSA, STScI · Laurent Pueyo, William Balmer, Marshall Perrin',
  href: 'https://science.nasa.gov/asset/webb/hr-8799-nircam-image/',
};

const starRadiusSolar = 1.44;
const temperatureK = 7339;

// Semimajor axes, periods, and inclinations use the Zurlo et al. (2016) Case A solution.
const planets = [
  { letter: 'b', axisAu: 67.96, periodDays: 166_510.17, inclination: 30.27, phase: 143, radiusEarth: 13, colors: ['#302f55', '#6e82b8', '#a9b9e5'] },
  { letter: 'c', axisAu: 42.81, periodDays: 83_255.09, inclination: 29.43, phase: 61, radiusEarth: 13, colors: ['#3b4355', '#8497b0', '#d9e5f0'] },
  { letter: 'd', axisAu: 26.97, periodDays: 41_627.54, inclination: 38.63, phase: 326, radiusEarth: 13, colors: ['#493f63', '#a899b7', '#e1d9eb'] },
  { letter: 'e', axisAu: 16.99, periodDays: 20_815.6, inclination: 30.95, phase: 17, radiusEarth: 13.1, colors: ['#673934', '#af7260', '#e7ad8d'] },
] as const;

const planetBodies: Body[] = planets.map(({ letter, axisAu, periodDays, inclination, phase, radiusEarth, colors }, index) => ({
  id: `hr-8799-${letter}`,
  name: `HR 8799 ${letter}`,
  kind: 'planet',
  parent: 'hr-8799-star',
  radiusKm: Math.round(radiusEarth * EARTH_RADIUS_KM),
  displayRadius: 0.95,
  tilt: 0,
  colors,
  appearance: 'bands',
  cloudBands: [173 + index * 7, 9.5, 4.5, 0.62],
  orbit: { axisAu, periodDays, inclination, eccentricity: 0, ascendingNode: 0, perihelionLongitude: 0, meanLongitude: phase },
  note: message('catalog.hr-8799.planetNote'),
  sources: [ARCHIVE, WEBB],
}));

export const hr8799: StarSystem = {
  id: 'hr-8799',
  name: 'HR 8799',
  aliases: ['HD 218396', 'HIP 114189'],
  overviewDistance: 2100,
  neighborhood: {
    distanceLightYears: 41.2441 * (LIGHT_YEARS_PER_KPC / 1000),
    rightAscension: 346.87017,
    declination: 21.13404,
    source: ARCHIVE,
  },
  summary: message('catalog.hr-8799.summary'),
  observation: {
    file: '/textures/star-systems/hr-8799/webb-nircam.webp',
    width: 718,
    height: 718,
    alt: message('catalog.hr-8799.observationAlt'),
    caption: message('catalog.hr-8799.observationCaption'),
    source: WEBB,
  },
  bodies: [
    {
      id: 'hr-8799-star',
      name: message('catalog.hr-8799.starName'),
      kind: 'star',
      parent: null,
      radiusKm: Math.round(starRadiusSolar * SOLAR_RADIUS_KM),
      displayRadius: 3.6,
      tilt: 0,
      colors: ['#7894ba', '#c5ddff', '#eef5ff'],
      stellar: {
        evolutionaryStage: message('catalog.stellar-stage.mainSequence'),
        spectralType: 'A5 V',
        temperatureK,
        luminosityWatts: SOLAR_LUMINOSITY_W * starRadiusSolar ** 2 * (temperatureK / SOLAR_TEMPERATURE_K) ** 4,
        emissionColor: '#d0e4ff',
        photosphere: { seed: 8799, granuleScale: 140, activeRegions: 0.12 },
      },
      sources: [ARCHIVE],
    },
    ...planetBodies,
  ],
  sources: [ARCHIVE],
};
