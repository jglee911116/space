import { message } from '@/i18n/messages';
import type { OrbitElements, StarSystem } from '../../types';
import { DAYS_PER_YEAR, SOLAR_LUMINOSITY_W, SOLAR_RADIUS_KM } from '../../units';

export const SIRIUS_HUBBLE = {
  label: message('catalog.sirius.sirius-hubble.source.nasa-hubble-sirius-a-and-b'),
  href: 'https://science.nasa.gov/asset/hubble/the-dog-star-sirius-and-its-tiny-companion/',
};
const BINARY = { label: message('catalog.sirius.binary.source.bond-et-al-binary-orbit-and-physical'), href: 'https://doi.org/10.3847/1538-4357/aa6af8' };
const SOURCES = [SIRIUS_HUBBLE, BINARY];
const MASS_A = 2.063;
const MASS_B = 1.018;

function orbit(companionMass: number, argument: number): OrbitElements {
  const periodYears = 50.1284;
  const ascendingNode = 45.4;
  const perihelionLongitude = ascendingNode + argument;
  return {
    axisAu: (7.4957 / 0.3789) * (companionMass / (MASS_A + MASS_B)),
    eccentricity: 0.59142,
    inclination: 136.336,
    ascendingNode,
    perihelionLongitude,
    meanLongitude: perihelionLongitude + (360 * (2000 - 1994.5715)) / periodYears,
    periodDays: periodYears * DAYS_PER_YEAR,
  };
}

export const sirius: StarSystem = {
  id: 'sirius',
  name: message('catalog.sirius.sirius.name'),
  neighborhood: { distanceLightYears: 8.59, rightAscension: 101.28715, declination: -16.71612, source: SIRIUS_HUBBLE },
  overviewDistance: 860,
  overviewLabel: message('catalog.alpha-centauri.alpha-centauri.overviewLabel'),
  summary: message('catalog.sirius.sirius.summary'),
  bodies: [
    {
      id: 'sirius-a',
      name: message('catalog.sirius.sirius-a.name'),
      kind: 'star',
      parent: null,
      radiusKm: Math.round(1.7144 * SOLAR_RADIUS_KM),
      displayRadius: 1.7144,
      tilt: 0,
      colors: ['#88a8da', '#f3f8ff', '#c8dfff'],
      orbit: orbit(MASS_B, 149.161 + 180),
      mass: message('catalog.sirius.sirius-a.mass'),
      stellar: {
        evolutionaryStage: message('catalog.stellar-stage.mainSequence'),
        spectralType: 'A1 V',
        temperatureK: 9845,
        luminosityWatts: 24.74 * SOLAR_LUMINOSITY_W,
        emissionColor: '#a9caff',
        glowStrength: 1.22,
        photosphere: { seed: 79, granuleScale: 155, activeRegions: 0 },
      },
      note: message('catalog.sirius.sirius-a.note'),
      sources: SOURCES,
    },
    {
      id: 'sirius-b',
      name: message('catalog.sirius.sirius-b.name'),
      kind: 'star',
      parent: null,
      radiusKm: Math.round(0.008 * SOLAR_RADIUS_KM),
      displayRadius: 0.085,
      tilt: 0,
      colors: ['#7c9ecb', '#e7f3ff', '#afcfff'],
      orbit: orbit(MASS_A, 149.161),
      mass: message('catalog.sirius.sirius-b.mass'),
      stellar: {
        evolutionaryStage: message('catalog.procyon.procyon-b.evolutionaryStage'),
        spectralType: 'DA',
        temperatureK: 25_000,
        luminosityWatts: 0.0245 * SOLAR_LUMINOSITY_W,
        emissionColor: '#b2cfff',
        glowStrength: 0.52,
        photosphere: { seed: 83, granuleScale: 0, activeRegions: 0 },
      },
      note: message('catalog.sirius.sirius-b.note'),
      sources: SOURCES,
    },
  ],
  sources: SOURCES,
};
