import { message } from '@/i18n/messages';
import type { Body, StarSystem } from '../../types';
import { SOLAR_LUMINOSITY_W, SOLAR_RADIUS_KM } from '../../units';

const ARCHIVE = { label: 'NASA Exoplanet Archive · TRAPPIST-1', href: 'https://exoplanetarchive.ipac.caltech.edu/overview/TRAPPIST-1' };
const AGOL = { label: message('catalog.trappist-1.agol.source.agol-et-al-planet-masses-and-radii'), href: 'https://doi.org/10.3847/PSJ/abd022' };
const EARTH_RADIUS_KM = 6371;
const star: Body = {
  id: 'trappist-1-star',
  name: message('catalog.trappist-1.trappist-1-star.name'),
  kind: 'star',
  parent: null,
  radiusKm: Math.round(0.1192 * SOLAR_RADIUS_KM),
  displayRadius: 0.078,
  tilt: 0,
  mass: message('catalog.trappist-1.trappist-1-star.mass'),
  colors: ['#631416', '#dc613b', '#ffaa84'],
  stellar: {
    evolutionaryStage: message('catalog.stellar-stage.mainSequence'),
    spectralType: 'M8 V',
    temperatureK: 2566,
    luminosityWatts: 0.000553 * SOLAR_LUMINOSITY_W,
    emissionColor: '#ff5036',
    photosphere: { seed: 127, granuleScale: 96, activeRegions: 0.61 },
  },
  sources: [ARCHIVE, AGOL],
};

const planetData = [
  { letter: 'b', a: 0.01154, days: 1.510826, radius: 1.116, mass: 1.374, phase: 18, colors: ['#31201d', '#8d5140', '#c88b6b'], rockySurface: [277, 0.14, 0.87, 0.62] },
  { letter: 'c', a: 0.0158, days: 2.421937, radius: 1.097, mass: 1.308, phase: 76, colors: ['#362e2d', '#866c66', '#c6a697'], rockySurface: [281, 0.33, 0.68, 0.81] },
  { letter: 'd', a: 0.02227, days: 4.049219, radius: 0.788, mass: 0.388, phase: 129, colors: ['#322d24', '#8e7b55', '#cbbb8c'], rockySurface: [293, 0.29, 0.61, 0.51] },
  { letter: 'e', a: 0.02925, days: 6.101013, radius: 0.92, mass: 0.692, phase: 182, colors: ['#282e2e', '#697771', '#a6b6a9'], rockySurface: [307, 0.22, 0.72, 0.35] },
  { letter: 'f', a: 0.03849, days: 9.20754, radius: 1.045, mass: 1.039, phase: 228, colors: ['#2c323b', '#637b96', '#abc5e3'], rockySurface: [311, 0.42, 0.66, 0.41] },
  { letter: 'g', a: 0.04683, days: 12.35245, radius: 1.129, mass: 1.321, phase: 278, colors: ['#333044', '#7f749d', '#bcb5d8'], rockySurface: [313, 0.53, 0.55, 0.49] },
  { letter: 'h', a: 0.06189, days: 18.77287, radius: 0.755, mass: 0.326, phase: 325, colors: ['#363539', '#858388', '#c4c6cd'], rockySurface: [317, 0.45, 0.77, 0.91] },
] as const;

const planets: Body[] = planetData.map(({ letter, a, days, radius, mass, phase, colors, rockySurface }) => ({
  id: `trappist-1-${letter}`,
  name: `TRAPPIST-1 ${letter}`,
  kind: 'planet',
  parent: star.id,
  radiusKm: Math.round(radius * EARTH_RADIUS_KM),
  displayRadius: radius * 0.014,
  tilt: 0,
  colors,
  rockySurface,
  orbit: { axisAu: a, eccentricity: 0, inclination: 0, ascendingNode: 0, perihelionLongitude: 0, meanLongitude: phase, periodDays: days },
  mass: message('catalog.trappist-1.planets.mass', mass),
  note: message('catalog.trappist-1.planets.note'),
  sources: [ARCHIVE, AGOL],
}));

export const trappist1: StarSystem = {
  id: 'trappist-1',
  name: 'TRAPPIST-1',
  neighborhood: { distanceLightYears: 40.54, rightAscension: 346.62639, declination: -5.04346, source: ARCHIVE },
  overviewDistance: 2.3,
  summary: message('catalog.trappist-1.trappist-1.summary'),
  bodies: [star, ...planets],
  sources: [ARCHIVE, AGOL],
};
