import { message } from '@/i18n/messages';
import type { Body, Source, StarSystem } from '../types';
import { EARTH_RADIUS_KM, LIGHT_YEARS_PER_KPC, SOLAR_LUMINOSITY_W, SOLAR_RADIUS_KM, SOLAR_TEMPERATURE_K } from '../units';

const lightYearsPerParsec = LIGHT_YEARS_PER_KPC / 1000;
const lhsSource = { label: 'NASA Exoplanet Archive · LHS 1140', href: 'https://exoplanetarchive.ipac.caltech.edu/overview/GJ%203053' };
const glieseSource = { label: 'NASA Exoplanet Archive · Gliese 12', href: 'https://exoplanetarchive.ipac.caltech.edu/overview/Gliese%2012%20b' };
const glieseDiscovery = { label: 'Kuzuhara et al. · Gliese 12 b', href: 'https://ntrs.nasa.gov/citations/20250005678' };

type Photosphere = NonNullable<NonNullable<Body['stellar']>['photosphere']>;
type Terrain = Required<Pick<Body, 'colors' | 'rockySurface'>>;

function redDwarf(id: string, name: string, radiusSolar: number, temperatureK: number, spectralType: string, photosphere: Photosphere, sources: readonly Source[]): Body {
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
      luminosityWatts: SOLAR_LUMINOSITY_W * radiusSolar ** 2 * (temperatureK / SOLAR_TEMPERATURE_K) ** 4,
      emissionColor: '#ff9b6c',
      photosphere,
    },
    sources,
  };
}

function transitPlanet(id: string, name: string, parent: string, radiusEarth: number, axisAu: number, periodDays: number, terrain: Terrain, sources: readonly Source[]): Body {
  return {
    id,
    name,
    kind: 'planet',
    parent,
    radiusKm: Math.round(radiusEarth * EARTH_RADIUS_KM),
    displayRadius: 0.024,
    tilt: 0,
    appearance: 'rock',
    ...terrain,
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
    redDwarf('lhs-1140-star', 'LHS 1140', 0.2159, 3096, 'M4.5 V', { seed: 139, granuleScale: 121, activeRegions: 0.18 }, [lhsSource]),
    transitPlanet('lhs-1140-b', 'LHS 1140 b', 'lhs-1140-star', 1.73, 0.0946, 24.73723, { colors: ['#293742', '#657985', '#bfccd0'], rockySurface: [337, 0.58, 0.48, 0.12] }, [lhsSource]),
    transitPlanet('lhs-1140-c', 'LHS 1140 c', 'lhs-1140-star', 1.272, 0.027, 3.77794, { colors: ['#3d2927', '#896455', '#c99f83'], rockySurface: [347, 0.15, 0.83, 0.68] }, [lhsSource]),
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
    redDwarf('gliese-12-star', 'Gliese 12', 0.262, 3296, 'M3 V', { seed: 137, granuleScale: 139, activeRegions: 0.27 }, [glieseSource, glieseDiscovery]),
    transitPlanet('gliese-12-b', 'Gliese 12 b', 'gliese-12-star', 0.96, 0.0668, 12.761408, { colors: ['#342d2b', '#8a7864', '#c3aa8e'], rockySurface: [331, 0.38, 0.72, 0.48] }, [
      glieseSource,
      glieseDiscovery,
    ]),
  ],
  sources: [glieseSource, glieseDiscovery],
};
