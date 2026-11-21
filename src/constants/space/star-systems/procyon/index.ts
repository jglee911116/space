import { message } from '@/i18n/messages';
import type { OrbitElements, StarSystem } from '../../types';
import { DAYS_PER_YEAR, SOLAR_LUMINOSITY_W, SOLAR_RADIUS_KM } from '../../units';

const BOND = { label: message('catalog.procyon.bond.source.bond-et-al-hubble-observations-of-procyon'), href: 'https://arxiv.org/abs/1510.00485' };
const POSITION = { label: message('catalog.procyon.position.source.simbad-procyon'), href: 'https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=procyon' };

function orbit(companionMass: number, argument: number): OrbitElements {
  const ascendingNode = 100.683;
  const perihelionLongitude = ascendingNode + argument;
  return {
    axisAu: (15.1 * companionMass) / (1.478 + 0.592),
    eccentricity: 0.39785,
    inclination: 31.408,
    ascendingNode,
    perihelionLongitude,
    meanLongitude: perihelionLongitude + (360 * (2000 - 1968.076)) / 40.84,
    periodDays: 40.84 * DAYS_PER_YEAR,
  };
}

export const procyon: StarSystem = {
  id: 'procyon',
  name: message('catalog.procyon.procyon.name'),
  neighborhood: { distanceLightYears: 11.46, rightAscension: 114.8255, declination: 5.225, source: POSITION },
  overviewDistance: 620,
  overviewLabel: message('navigation.viewBinary'),
  summary: message('catalog.procyon.procyon.summary'),
  bodies: [
    {
      id: 'procyon-a',
      name: message('catalog.procyon.procyon-a.name'),
      kind: 'star',
      parent: null,
      radiusKm: Math.round(2.031 * SOLAR_RADIUS_KM),
      displayRadius: 2.03,
      tilt: 0,
      colors: ['#b7a18f', '#fff6e5', '#fff1d7'],
      orbit: orbit(0.592, 269.23),
      mass: message('catalog.procyon.procyon-a.mass'),
      stellar: {
        evolutionaryStage: message('catalog.procyon.procyon-a.evolutionaryStage'),
        spectralType: 'F5 IV–V',
        temperatureK: 6530,
        luminosityWatts: 6.75 * SOLAR_LUMINOSITY_W,
        emissionColor: '#ffe5ad',
        photosphere: { seed: 109, granuleScale: 126, activeRegions: 0.12 },
      },
      sources: [BOND, POSITION],
    },
    {
      id: 'procyon-b',
      name: message('catalog.procyon.procyon-b.name'),
      kind: 'star',
      parent: null,
      radiusKm: Math.round(0.01234 * SOLAR_RADIUS_KM),
      displayRadius: 0.09,
      tilt: 0,
      colors: ['#63638a', '#e8e7ff', '#cdd6ff'],
      orbit: orbit(1.478, 89.23),
      mass: message('catalog.procyon.procyon-b.mass'),
      stellar: {
        evolutionaryStage: message('catalog.stellar-stage.whiteDwarf'),
        spectralType: 'DQZ',
        temperatureK: 7740,
        luminosityWatts: 0.00049 * SOLAR_LUMINOSITY_W,
        emissionColor: '#d5dfff',
        glowStrength: 0.48,
        photosphere: { seed: 113, granuleScale: 0, activeRegions: 0 },
      },
      note: message('catalog.procyon.procyon-b.note'),
      sources: [BOND],
    },
  ],
  sources: [BOND, POSITION],
};
