import { message } from '@/i18n/messages';
import type { OrbitElements, StarSystem } from '../../types';
import { SOLAR_RADIUS_KM, SOLAR_LUMINOSITY_W } from '../../units';

const ARCHIVE = { label: 'NASA Exoplanet Archive · Kepler-16', href: 'https://exoplanetarchive.ipac.caltech.edu/overview/Kepler-16' };
const DOYLE = { label: message('catalog.kepler-16.doyle.source.doyle-et-al-binary-and-planetary-orbits'), href: 'https://doi.org/10.1126/science.1210923' };
const SOURCES = [ARCHIVE, DOYLE];

function orbit(companionMass: number, angle: number): OrbitElements {
  return {
    axisAu: (0.22431 * companionMass) / (0.6897 + 0.20255),
    eccentricity: 0.15944,
    inclination: 0,
    ascendingNode: 0,
    perihelionLongitude: angle,
    meanLongitude: angle + 40,
    periodDays: 41.07922,
  };
}

export const kepler16: StarSystem = {
  id: 'kepler-16',
  name: 'Kepler-16',
  neighborhood: { distanceLightYears: 244.9, rightAscension: 289.07583, declination: 51.75723, source: ARCHIVE },
  overviewDistance: 25,
  overviewLabel: message('catalog.kepler-16.kepler-16.overviewLabel'),
  summary: message('catalog.kepler-16.kepler-16.summary'),
  bodies: [
    {
      id: 'kepler-16-a',
      name: 'Kepler-16 A',
      kind: 'star',
      parent: null,
      radiusKm: Math.round(0.6489 * SOLAR_RADIUS_KM),
      displayRadius: 0.145,
      tilt: 0,
      colors: ['#a1421b', '#ffd19b', '#ffb77b'],
      orbit: orbit(0.20255, 83.464),
      mass: message('catalog.kepler-16.kepler-16-a.mass'),
      stellar: {
        evolutionaryStage: message('catalog.stellar-stage.mainSequence'),
        spectralType: message('catalog.kepler-16.kepler-16-a.spectralType'),
        temperatureK: 4450,
        luminosityWatts: 0.149 * SOLAR_LUMINOSITY_W,
        emissionColor: '#ffa85a',
      },
      sources: SOURCES,
    },
    {
      id: 'kepler-16-secondary',
      name: 'Kepler-16 B',
      kind: 'star',
      parent: null,
      radiusKm: Math.round(0.22623 * SOLAR_RADIUS_KM),
      displayRadius: 0.075,
      tilt: 0,
      colors: ['#701b18', '#ff8a56', '#ff926b'],
      orbit: orbit(0.6897, 263.464),
      mass: message('catalog.kepler-16.kepler-16-secondary.mass'),
      note: message('catalog.kepler-16.kepler-16-secondary.note'),
      sources: SOURCES,
    },
    {
      id: 'kepler-16-b',
      name: 'Kepler-16 b',
      kind: 'planet',
      parent: null,
      radiusKm: Math.round(0.7538 * 71_492),
      displayRadius: 0.115,
      tilt: 0,
      colors: ['#453c3d', '#a29582', '#e3ccaa'],
      appearance: 'bands',
      orbit: { axisAu: 0.7048, eccentricity: 0.0069, inclination: 0, ascendingNode: 0, perihelionLongitude: 318, meanLongitude: 120, periodDays: 228.776 },
      mass: message('catalog.kepler-16.kepler-16-b.mass'),
      note: message('catalog.kepler-16.kepler-16-b.note'),
      sources: SOURCES,
    },
  ],
  sources: SOURCES,
};
