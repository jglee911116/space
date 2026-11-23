import { message } from '@/i18n/messages';
import type { Body, OrbitElements, StarSystem } from '../../types';
import { DAYS_PER_YEAR, SOLAR_LUMINOSITY_W, SOLAR_RADIUS_KM } from '../../units';

const NASA = { label: message('catalog.sources.nasa-stars-near-the-sun'), href: 'https://science.nasa.gov/sun/facts/' };
const BINARY_ORBIT = { label: message('catalog.alpha-centauri.binary-orbit.source.akeson-et-al-a-b-binary-orbit'), href: 'https://doi.org/10.3847/1538-3881/abfaff' };
const SPECTRA = { label: message('catalog.alpha-centauri.spectra.source.kervella-et-al-spectral-types-and-stellar'), href: 'https://doi.org/10.1051/0004-6361/201629505' };
const WIDE_ORBIT = { label: message('catalog.alpha-centauri.wide-orbit.source.kervella-et-al-proxima-orbit'), href: 'https://doi.org/10.1051/0004-6361/201629930' };
const PROXIMA_PROPERTIES = { label: message('catalog.alpha-centauri.proxima-properties.source.ribas-et-al-proxima-radiation'), href: 'https://doi.org/10.1051/0004-6361/201730582' };
const PROXIMA_FLARES = { label: 'MacGregor et al. · Proxima Centauri flare', href: 'https://doi.org/10.3847/2041-8213/abf14c' };
const PLANET_ARCHIVE = { label: message('catalog.alpha-centauri.planet-archive.source.nasa-exoplanet-archive-alpha-centauri'), href: 'https://exoplanetarchive.ipac.caltech.edu/overview/alf%20Cen' };

const MASS_A = 1.0788;
const MASS_B = 0.9092;

// 논문의 하늘 기준면을 장면 기준면으로 두고 J2000의 평균 근점이각을 계산한다.
function stellarOrbit(axisAu: number, eccentricity: number, inclination: number, ascendingNode: number, argument: number, years: number, periapsisYear: number): OrbitElements {
  const perihelionLongitude = ascendingNode + argument;
  return {
    axisAu,
    eccentricity,
    inclination,
    ascendingNode,
    perihelionLongitude,
    meanLongitude: perihelionLongitude + (360 * (2000 - periapsisYear)) / years,
    periodDays: years * DAYS_PER_YEAR,
  };
}

function binaryOrbit(companionMass: number, argument: number) {
  return stellarOrbit((23.299 * companionMass) / (MASS_A + MASS_B), 0.51947, 79.243, 205.073, argument, 79.762, 1955.564);
}

function planetOrbit(axisAu: number, periodDays: number, meanLongitude: number): OrbitElements {
  return { axisAu, eccentricity: 0, inclination: 0, ascendingNode: 0, perihelionLongitude: 0, meanLongitude, periodDays };
}

const planetNote = message('catalog.alpha-centauri.planet-note.text');

const bodies: readonly Body[] = [
  {
    id: 'alpha-centauri-a',
    name: message('catalog.alpha-centauri.alpha-centauri-a.name'),
    kind: 'star',
    parent: null,
    radiusKm: Math.round(1.2175 * SOLAR_RADIUS_KM),
    tilt: 0,
    displayRadius: 1.2175,
    colors: ['#c77c3c', '#fff1d6', '#fff2d8'],
    orbit: binaryOrbit(MASS_B, 231.519 + 180),
    mass: message('catalog.alpha-centauri.alpha-centauri-a.mass'),
    stellar: {
      evolutionaryStage: message('catalog.stellar-stage.mainSequence'),
      spectralType: 'G2 V',
      temperatureK: 5795,
      luminosityWatts: 1.521 * SOLAR_LUMINOSITY_W,
      emissionColor: '#ffddac',
      photosphere: { seed: 13, granuleScale: 138, activeRegions: 0.24 },
    },
    note: message('catalog.alpha-centauri.alpha-centauri-a.note'),
    sources: [NASA, BINARY_ORBIT, SPECTRA],
  },
  {
    id: 'alpha-centauri-b',
    name: message('catalog.alpha-centauri.alpha-centauri-b.name'),
    kind: 'star',
    parent: null,
    radiusKm: Math.round(0.8591 * SOLAR_RADIUS_KM),
    tilt: 0,
    displayRadius: 0.8591,
    colors: ['#a35327', '#ffce91', '#ffdaa3'],
    orbit: binaryOrbit(MASS_A, 231.519),
    mass: message('catalog.alpha-centauri.alpha-centauri-b.mass'),
    stellar: {
      evolutionaryStage: message('catalog.stellar-stage.mainSequence'),
      spectralType: 'K1 V',
      temperatureK: 5231,
      luminosityWatts: 0.503 * SOLAR_LUMINOSITY_W,
      emissionColor: '#ffaf64',
      photosphere: { seed: 31, granuleScale: 170, activeRegions: 0.38 },
    },
    note: message('catalog.alpha-centauri.alpha-centauri-b.note'),
    sources: [NASA, BINARY_ORBIT, SPECTRA],
  },
  {
    id: 'proxima-centauri',
    name: message('catalog.alpha-centauri.proxima-centauri.name'),
    kind: 'star',
    parent: null,
    radiusKm: Math.round(0.146 * SOLAR_RADIUS_KM),
    tilt: 0,
    displayRadius: 0.146,
    colors: ['#631810', '#ff985f', '#ff9c68'],
    orbit: stellarOrbit(8700, 0.5, 107.6, 126, 72.3, 547_000, 2000 + 283_000),
    mass: message('catalog.alpha-centauri.proxima-centauri.mass'),
    stellar: {
      evolutionaryStage: message('catalog.stellar-stage.mainSequence'),
      spectralType: 'M5.5 V',
      temperatureK: 2980,
      luminosityWatts: 5.8e23,
      emissionColor: '#ff5836',
      photosphere: { seed: 57, granuleScale: 105, activeRegions: 0.86, flarePreview: true },
    },
    note: message('catalog.alpha-centauri.proxima-centauri.note'),
    sources: [NASA, WIDE_ORBIT, PROXIMA_PROPERTIES, SPECTRA, PROXIMA_FLARES],
  },
  {
    id: 'proxima-b',
    name: message('catalog.alpha-centauri.proxima-b.name'),
    kind: 'planet',
    parent: 'proxima-centauri',
    tilt: 0,
    displayRadius: 0.04,
    colors: ['#302624', '#99705b', '#dfb393'],
    rockySurface: [139, 0.19, 0.82, 0.55],
    orbit: planetOrbit(0.04856, 11.2, 48),
    mass: message('catalog.alpha-centauri.proxima-b.mass'),
    note: planetNote,
    sources: [{ label: message('catalog.alpha-centauri.proxima-b.source.nasa-proxima-b'), href: 'https://science.nasa.gov/exoplanet-catalog/proxima-centauri-b/' }, PLANET_ARCHIVE],
  },
  {
    id: 'proxima-d',
    name: message('catalog.alpha-centauri.proxima-d.name'),
    kind: 'planet',
    parent: 'proxima-centauri',
    tilt: 0,
    displayRadius: 0.026,
    colors: ['#292529', '#726363', '#b6a69c'],
    rockySurface: [173, 0.05, 0.9, 0.86],
    orbit: planetOrbit(0.02881, 5.12, 220),
    mass: message('catalog.alpha-centauri.proxima-d.mass'),
    note: planetNote,
    sources: [{ label: message('catalog.alpha-centauri.proxima-d.source.nasa-proxima-d'), href: 'https://science.nasa.gov/exoplanet-catalog/proxima-centauri-d/' }, PLANET_ARCHIVE],
  },
];

export const alphaCentauri: StarSystem = {
  id: 'alpha-centauri',
  name: message('catalog.alpha-centauri.alpha-centauri.name'),
  neighborhood: {
    distanceLightYears: 4.37,
    rightAscension: 219.9045,
    declination: -60.81564,
    source: { label: message('catalog.alpha-centauri.alpha-centauri.source.nasa-direction-of-alpha-centauri'), href: 'https://science.nasa.gov/asset/webb/alpha-centauri-3-panel-dss-hubble-webb/' },
  },
  overviewDistance: 950,
  overviewLabel: message('navigation.viewBinary'),
  wideOverview: { distance: 480_000, label: message('catalog.alpha-centauri.alpha-centauri.wideOverviewLabel') },
  galacticPath: {
    radialAmplitudeKpc: 0.84,
    periodYears: 240_000_000,
    color: '#70d8ff',
    source: { label: message('catalog.alpha-centauri.alpha-centauri.source.banik-kroupa-galactic-orbit-model-of-alpha'), href: 'https://doi.org/10.1093/mnras/sty2007' },
  },
  summary: message('catalog.alpha-centauri.alpha-centauri.summary'),
  bodies,
  sources: [NASA, BINARY_ORBIT, WIDE_ORBIT, PLANET_ARCHIVE],
};
