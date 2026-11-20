import { message } from '@/i18n/messages';
import type { Body, StarSystem } from '../../types';
import { SOLAR_LUMINOSITY_W, SOLAR_RADIUS_KM } from '../../units';

export const BARNARD_ARCHIVE = {
  label: message('catalog.barnard-star.barnard-archive.source.nasa-exoplanet-archive-barnard-s-star'),
  href: 'https://exoplanetarchive.ipac.caltech.edu/overview/barnard%20star',
};
const DISCOVERY = { label: message('catalog.barnard-star.discovery.source.basant-et-al-four-exoplanets'), href: 'https://doi.org/10.3847/2041-8213/adb8d5' };
const star: Body = {
  id: 'barnard',
  name: message('catalog.barnard-star.barnard.name'),
  kind: 'star',
  parent: null,
  radiusKm: Math.round(0.185 * SOLAR_RADIUS_KM),
  displayRadius: 0.135,
  focusScale: 4.65,
  tilt: 0,
  mass: message('catalog.barnard-star.barnard.mass'),
  colors: ['#771818', '#ff8258', '#ffac83'],
  stellar: {
    evolutionaryStage: message('catalog.stellar-stage.mainSequence'),
    spectralType: 'M4 V',
    temperatureK: 3195,
    luminosityWatts: 10 ** -2.45 * SOLAR_LUMINOSITY_W,
    emissionColor: '#ff633d',
  },
  note: message('catalog.barnard-star.barnard.note'),
  sources: [BARNARD_ARCHIVE, DISCOVERY],
};

const planetData = [
  { letter: 'd', axisAu: 0.0188, periodDays: 2.3402, mass: 0.263, phase: 95, colors: ['#30272a', '#8c7770', '#dabbab'] },
  { letter: 'b', axisAu: 0.0229, periodDays: 3.1542, mass: 0.299, phase: 5, colors: ['#33251e', '#9b715b', '#e6ac82'] },
  { letter: 'c', axisAu: 0.0274, periodDays: 4.1244, mass: 0.335, phase: 182, colors: ['#2b2737', '#826e94', '#bfaed6'] },
  { letter: 'e', axisAu: 0.0381, periodDays: 6.7392, mass: 0.193, phase: 275, colors: ['#2b2920', '#7d7855', '#c4ba84'] },
] as const;

const planets: Body[] = planetData.map(({ letter, axisAu, periodDays, mass, phase, colors }) => ({
  id: `barnard-${letter}`,
  name: message('catalog.barnard-star.planets.name', letter),
  kind: 'planet',
  parent: star.id,
  displayRadius: 0.016,
  colors,
  tilt: 0,
  orbit: { axisAu, eccentricity: 0, inclination: 0, ascendingNode: 0, perihelionLongitude: 0, meanLongitude: phase, periodDays },
  mass: message('catalog.barnard-star.planets.mass', mass),
  note: message('catalog.barnard-star.planets.note'),
  sources: [BARNARD_ARCHIVE, DISCOVERY],
}));

export const barnardStar: StarSystem = {
  id: 'barnard-star',
  name: message('catalog.barnard-star.barnard-star.name'),
  neighborhood: { distanceLightYears: 5.96, rightAscension: 269.448625, declination: 4.73798, source: BARNARD_ARCHIVE },
  galacticPath: {
    minRadiusKpc: 6.05,
    radialAmplitudeKpc: (13.74 - 6.05) / 2,
    periodYears: 230_000_000,
    color: '#ed9aef',
    source: { label: message('catalog.barnard-star.barnard-star.source.sperauskas-et-al-galactic-orbit-model-of'), href: 'https://doi.org/10.1051/0004-6361/201527850' },
  },
  overviewDistance: 1.42,
  summary: message('catalog.barnard-star.barnard-star.summary'),
  bodies: [star, ...planets],
  sources: [BARNARD_ARCHIVE, DISCOVERY],
};
