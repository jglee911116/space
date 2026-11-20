import { message } from '@/i18n/messages';
import type { Body, Source, StarSystem } from '../types';
import { AU_PER_KPC, KM_PER_AU, KM_PER_LIGHT_YEAR, SOLAR_LUMINOSITY_W, SOLAR_RADIUS_KM } from '../units';

const lightYearsPerParsec = (AU_PER_KPC * KM_PER_AU) / (1000 * KM_PER_LIGHT_YEAR);
const earthMeanRadiusKm = 6371;
const lhsSource = { label: 'NASA Exoplanet Archive · LHS 1140', href: 'https://exoplanetarchive.ipac.caltech.edu/overview/GJ%203053' };
const glieseSource = { label: 'NASA Exoplanet Archive · Gliese 12', href: 'https://exoplanetarchive.ipac.caltech.edu/overview/Gliese%2012%20b' };
const glieseDiscovery = { label: 'Kuzuhara et al. · Gliese 12 b', href: 'https://ntrs.nasa.gov/citations/20250005678' };

function redDwarf(id: string, name: string, radiusSolar: number, temperatureK: number, spectralType: string, sources: readonly Source[]): Body {
  return {
    id,
    name,
    kind: 'star',
    parent: null,
    radiusKm: Math.round(radiusSolar * SOLAR_RADIUS_KM),
    displayRadius: 0.13,
    tilt: 0,
    colors: ['#822b27', '#eb8054', '#ffc18b'],
    stellar: {
      evolutionaryStage: message('catalog.stellar-stage.mainSequence'),
      spectralType,
      temperatureK,
      luminosityWatts: SOLAR_LUMINOSITY_W * radiusSolar ** 2 * (temperatureK / 5772) ** 4,
      emissionColor: '#ff9b6c',
    },
    sources,
  };
}

function transitPlanet(id: string, name: string, parent: string, radiusEarth: number, axisAu: number, periodDays: number, sources: readonly Source[]): Body {
  return {
    id,
    name,
    kind: 'planet',
    parent,
    radiusKm: Math.round(radiusEarth * earthMeanRadiusKm),
    displayRadius: 0.024,
    tilt: 0,
    appearance: 'rock',
    colors: ['#3f484e', '#868b97', '#c2beb5'],
    orbit: { axisAu, periodDays, eccentricity: 0, inclination: 0, ascendingNode: 0, perihelionLongitude: 0, meanLongitude: 30 },
    note: message('catalog.nearby-exoplanets.transit-model'),
    sources,
  };
}

export const lhs1140: StarSystem = {
  id: 'lhs-1140',
  name: 'LHS 1140',
  summary: message('catalog.nearby-exoplanets.lhs1140.summary'),
  overviewDistance: 2.8,
  neighborhood: { distanceLightYears: 14.9861 * lightYearsPerParsec, rightAscension: 11.24863, declination: -15.27411, source: lhsSource },
  bodies: [
    redDwarf('lhs-1140-star', 'LHS 1140', 0.2159, 3096, 'M4.5 V', [lhsSource]),
    transitPlanet('lhs-1140-b', 'LHS 1140 b', 'lhs-1140-star', 1.73, 0.0946, 24.73723, [lhsSource]),
    transitPlanet('lhs-1140-c', 'LHS 1140 c', 'lhs-1140-star', 1.272, 0.027, 3.77794, [lhsSource]),
  ],
  sources: [lhsSource],
};

export const gliese12: StarSystem = {
  id: 'gliese-12',
  name: 'Gliese 12',
  summary: message('catalog.nearby-exoplanets.gliese12.summary'),
  overviewDistance: 2,
  neighborhood: { distanceLightYears: 12.21 * lightYearsPerParsec, rightAscension: 3.95792, declination: 13.55762, source: glieseSource },
  bodies: [
    redDwarf('gliese-12-star', 'Gliese 12', 0.262, 3296, 'M3 V', [glieseSource, glieseDiscovery]),
    transitPlanet('gliese-12-b', 'Gliese 12 b', 'gliese-12-star', 0.96, 0.0668, 12.761408, [glieseSource, glieseDiscovery]),
  ],
  sources: [glieseSource, glieseDiscovery],
};
