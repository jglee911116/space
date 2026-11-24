import { message, type CatalogText } from '@/i18n/messages';
import type { Body, StarSystem } from '../../types';
import { KM_PER_AU, SOLAR_LUMINOSITY_W, SOLAR_RADIUS_KM, SOLAR_TEMPERATURE_K } from '../../units';

const SOURCE = { label: message('catalog.m31-eclipsing-binary.source.source.vilardell-et-al-eclipsing-binary-observations-and'), href: 'https://doi.org/10.1051/0004-6361/200913299' };
const PRIMARY_MASS = 21.7;
const SECONDARY_MASS = 15.4;
const SEPARATION_KM = 22.6 * SOLAR_RADIUS_KM;

function component(id: string, name: CatalogText, mass: number, companionMass: number, radiusSolar: number, temperatureK: number, phase: number): Body {
  const radiusKm = radiusSolar * SOLAR_RADIUS_KM;
  const hotter = temperatureK > 32_000;
  return {
    id,
    name,
    kind: 'star',
    parent: null,
    mass: message('catalog.m31-eclipsing-binary.mass', mass),
    radiusKm: Math.round(radiusKm),
    displayRadius: (radiusKm / KM_PER_AU) * 10,
    tilt: 0,
    colors: hotter ? ['#8db3ed', '#e4f0ff', '#b5d6ff'] : ['#91acd4', '#e9f0ff', '#c7dcff'],
    stellar: {
      evolutionaryStage: message('catalog.m31-eclipsing-binary.evolutionaryStage'),
      spectralType: message('catalog.m31-eclipsing-binary.spectralType'),
      temperatureK,
      luminosityWatts: radiusSolar ** 2 * (temperatureK / SOLAR_TEMPERATURE_K) ** 4 * SOLAR_LUMINOSITY_W,
      emissionColor: hotter ? '#a8caff' : '#b9d0fc',
      glowStrength: hotter ? 1.12 : 0.84,
      photosphere: { seed: hotter ? 163 : 167, granuleScale: 0, activeRegions: 0 },
    },
    orbit: {
      axisAu: (SEPARATION_KM / KM_PER_AU) * (companionMass / (PRIMARY_MASS + SECONDARY_MASS)),
      eccentricity: 0,
      inclination: 69.9,
      ascendingNode: 0,
      perihelionLongitude: phase,
      meanLongitude: phase + 90,
      periodDays: 2.048644,
    },
    note: message('catalog.m31-eclipsing-binary.note'),
    sources: [SOURCE],
  };
}

export const m31EclipsingBinary: StarSystem = {
  id: 'm31v-j00443610-4129194',
  name: 'M31V J00443610+4129194',
  galaxyId: 'andromeda',
  // 하늘에서의 중심 상대 위치를 원반 지도에 투영한 표식(시선 방향 깊이 미반영).
  galaxyMarkerKpc: [-4.96, 0, 2.95],
  initialView: [0, 1, 0.0001],
  overviewDistance: 4.6,
  overviewLabel: message('catalog.m31-eclipsing-binary.m31v-j00443610-4129194.overviewLabel'),
  summary: message('catalog.m31-eclipsing-binary.m31v-j00443610-4129194.summary'),
  bodies: [
    component('m31v-primary', message('catalog.m31-eclipsing-binary.primary.name'), PRIMARY_MASS, SECONDARY_MASS, 9.2, 33_600, 0),
    component('m31v-secondary', message('catalog.m31-eclipsing-binary.companion.name'), SECONDARY_MASS, PRIMARY_MASS, 5.6, 30_100, 180),
  ],
  sources: [SOURCE],
};
