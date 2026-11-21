import { message } from '@/i18n/messages';
import type { Body, StarSystem } from '../../types';
import { SOLAR_LUMINOSITY_W, SOLAR_RADIUS_KM } from '../../units';

export const BARNARD_ARCHIVE = {
  label: message('catalog.barnard-star.barnard-archive.source.nasa-exoplanet-archive-barnard-s-star'),
  href: 'https://exoplanetarchive.ipac.caltech.edu/overview/barnard%20star',
};
const DISCOVERY = { label: message('catalog.barnard-star.discovery.source.basant-et-al-four-exoplanets'), href: 'https://doi.org/10.3847/2041-8213/adb8d5' };
const ROTATION = { label: 'González Hernández et al. · Barnard’s Star rotation', href: 'https://doi.org/10.1051/0004-6361/202451311' };
const star: Body = {
  id: 'barnard',
  name: message('catalog.barnard-star.barnard.name'),
  kind: 'star',
  parent: null,
  radiusKm: Math.round(0.185 * SOLAR_RADIUS_KM),
  spinDays: 140,
  displayRadius: 0.135,
  focusScale: 4.65,
  tilt: 0,
  mass: message('catalog.barnard-star.barnard.mass'),
  colors: ['#8a3829', '#ffb084', '#ffc09d'],
  stellar: {
    evolutionaryStage: message('catalog.stellar-stage.mainSequence'),
    spectralType: 'M4 V',
    temperatureK: 3195,
    luminosityWatts: 10 ** -2.45 * SOLAR_LUMINOSITY_W,
    emissionColor: '#ff7c5c',
    photosphere: { seed: 67, granuleScale: 124, activeRegions: 0.24 },
  },
  note: message('catalog.barnard-star.barnard.note'),
  sources: [BARNARD_ARCHIVE, DISCOVERY, ROTATION],
};

const planetData = [
  { letter: 'd', axisAu: 0.0188, periodDays: 2.3402, mass: 0.263, phase: 95, colors: ['#27252b', '#62616a', '#a49da3'], rockySurface: [191, 0.10, 0.65, 0.86] },
  { letter: 'b', axisAu: 0.0229, periodDays: 3.1542, mass: 0.299, phase: 5, colors: ['#39241d', '#a06b50', '#dbaf86'], rockySurface: [211, 0.24, 0.78, 0.44] },
  { letter: 'c', axisAu: 0.0274, periodDays: 4.1244, mass: 0.335, phase: 182, colors: ['#303038', '#777280', '#b4aeb9'], rockySurface: [227, 0.40, 0.53, 0.36] },
  { letter: 'e', axisAu: 0.0381, periodDays: 6.7392, mass: 0.193, phase: 275, colors: ['#302820', '#81724d', '#bead7c'], rockySurface: [251, 0.12, 0.68, 0.69] },
] as const;

const planets: Body[] = planetData.map(({ letter, axisAu, periodDays, mass, phase, colors, rockySurface }) => ({
  id: `barnard-${letter}`,
  name: message('catalog.barnard-star.planets.name', letter),
  kind: 'planet',
  parent: star.id,
  displayRadius: 0.016,
  colors,
  rockySurface,
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
