import { message } from '@/i18n/messages';
import type { Body, OrbitReferencePlane } from '../../types';
import { KM_PER_AU } from '../../units';
import { JPL_SATELLITE_ELEMENTS, JPL_SATELLITE_PHYSICAL, NASA_FACTSHEET } from './sources';

const sources = [JPL_SATELLITE_PHYSICAL, JPL_SATELLITE_ELEMENTS];
const satelliteNote = message('catalog.moons.satellite-note.text');

// JPL 표의 평균 요소를 보존하고, 궤도 세차와 초기 위상은 시연용으로 근사한다.
type MeanElements = [axisKm: number, eccentricity: number, periapsis: number, meanAnomaly: number, inclination: number, node: number, periodDays: number];

function satellite(
  body: Pick<Body, 'id' | 'name' | 'parent' | 'radiusKm' | 'displayRadius' | 'colors' | 'appearance' | 'shape' | 'surfaceFeatures' | 'surfaceEffect' | 'rockySurface' | 'silhouette' | 'note'> & Partial<Pick<Body, 'sources'>>,
  [axisKm, eccentricity, periapsis, meanAnomaly, inclination, node, periodDays]: MeanElements,
  referencePlane: OrbitReferencePlane,
): Body {
  return {
    ...body,
    kind: 'moon',
    // 대표 위성은 동주기 자전으로 시각화한다.
    spinDays: periodDays,
    tilt: 0,
    orbit: {
      axisAu: axisKm / KM_PER_AU,
      eccentricity,
      inclination,
      ascendingNode: node,
      perihelionLongitude: node + periapsis,
      meanLongitude: node + periapsis + meanAnomaly,
      periodDays,
      referencePlane,
    },
    note: body.note ?? satelliteNote,
    sources: body.sources ? [...sources, ...body.sources] : sources,
  };
}

const marsPole = { rightAscension: 317.7, declination: 52.9 };
const jupiterPole = { rightAscension: 268.1, declination: 64.5 };
const saturnPole = { rightAscension: 40.6, declination: 83.5 };
const equator = 'parent-equator';

export const moons: Body[] = [
  {
    id: 'moon',
    name: message('catalog.moons.moon.name'),
    kind: 'moon',
    parent: 'earth',
    radiusKm: 1737.4,
    spinDays: 27.3217,
    tilt: 6.68,
    displayRadius: 0.08,
    colors: ['#6f6c69', '#9a9793', '#c9c6c1'],
    appearance: 'craters',
    orbit: { axisAu: 0.00256955529, eccentricity: 0.0549, inclination: 5.145, meanLongitude: 218.316, perihelionLongitude: 83.353, ascendingNode: 125.08, periodDays: 27.3217 },
    sources: [NASA_FACTSHEET],
  },
  satellite(
    {
      id: 'phobos',
      name: message('catalog.moons.phobos.name'),
      parent: 'mars',
      radiusKm: 11.08,
      displayRadius: 0.036,
      appearance: 'craters',
      colors: ['#453630', '#80706a', '#ac9382'],
      shape: [1.18, 0.82, 1.03],
    },
    [9375, 0.015, 216.3, 189.7, 1.1, 169.2, 0.3187],
    marsPole,
  ),
  satellite(
    {
      id: 'deimos',
      name: message('catalog.moons.deimos.name'),
      parent: 'mars',
      radiusKm: 6.2,
      displayRadius: 0.026,
      appearance: 'craters',
      colors: ['#54433c', '#98857b', '#c2a795'],
      shape: [1.21, 0.84, 0.98],
    },
    [23457, 0, 0, 205, 1.8, 54.3, 1.2625],
    { rightAscension: 316.6, declination: 53.5 },
  ),
  satellite(
    { id: 'io', name: message('catalog.moons.io.name'), parent: 'jupiter', radiusKm: 1821.49, displayRadius: 0.085, appearance: 'rock', colors: ['#994c24', '#e2a43e', '#fff2aa'], surfaceFeatures: 'io', note: message('catalog.moons.io.surface'), sources: [{ label: 'NASA / Io', href: 'https://science.nasa.gov/jupiter/jupiter-moons/io/facts/' }] },
    [421800, 0.004, 49.1, 330.9, 0, 0, 1.762732],
    jupiterPole,
  ),
  satellite(
    { id: 'europa', name: message('catalog.moons.europa.name'), parent: 'jupiter', radiusKm: 1560.8, displayRadius: 0.075, appearance: 'rock', colors: ['#855a4d', '#d7be9f', '#fff3d6'], surfaceFeatures: 'europa', note: message('catalog.moons.europa.surface'), sources: [{ label: 'NASA / Europa', href: 'https://science.nasa.gov/jupiter/jupiter-moons/europa/europa-facts/' }] },
    [671100, 0.009, 45, 345.4, 0.5, 184, 3.525463],
    jupiterPole,
  ),
  satellite(
    { id: 'ganymede', name: message('catalog.moons.ganymede.name'), parent: 'jupiter', radiusKm: 2631.2, displayRadius: 0.113, appearance: 'craters', colors: ['#504742', '#8d7c70', '#cbb9a6'] },
    [1070400, 0.001, 198.3, 324.8, 0.2, 58.5, 7.155588],
    { rightAscension: 268.2, declination: 64.6 },
  ),
  satellite(
    { id: 'callisto', name: message('catalog.moons.callisto.name'), parent: 'jupiter', radiusKm: 2410.3, displayRadius: 0.105, appearance: 'craters', colors: ['#342b25', '#6b5548', '#ad9281'] },
    [1882700, 0.007, 43.8, 87.4, 0.3, 309.1, 16.69044],
    { rightAscension: 268.7, declination: 64.8 },
  ),
  satellite(
    { id: 'mimas', name: message('catalog.moons.mimas.name'), parent: 'saturn', radiusKm: 198.2, displayRadius: 0.04, appearance: 'craters', colors: ['#5f625f', '#a9a9a2', '#d7d2c2'] },
    [186000, 0.02, 160.4, 275.3, 1.6, 66.2, 0.942422],
    saturnPole,
  ),
  satellite(
    { id: 'enceladus', name: message('catalog.moons.enceladus.name'), parent: 'saturn', radiusKm: 252.1, displayRadius: 0.045, appearance: 'rock', colors: ['#9bb0bc', '#d4e5e8', '#fffdf4'], surfaceEffect: 'ice-plumes' },
    [238400, 0.005, 119.5, 57, 0, 0, 1.370218],
    saturnPole,
  ),
  satellite(
    { id: 'tethys', name: message('catalog.moons.tethys.name'), parent: 'saturn', radiusKm: 531.1, displayRadius: 0.055, appearance: 'craters', colors: ['#727474', '#b8b8b3', '#e1e1d9'] },
    [295000, 0.001, 335.3, 0, 1.1, 273, 1.887802],
    saturnPole,
  ),
  satellite(
    { id: 'dione', name: message('catalog.moons.dione.name'), parent: 'saturn', radiusKm: 561.4, displayRadius: 0.058, appearance: 'rock', colors: ['#716967', '#b6a79b', '#e7d8c4'] },
    [377700, 0.002, 116, 212, 0, 0, 2.736916],
    saturnPole,
  ),
  satellite(
    { id: 'rhea', name: message('catalog.moons.rhea.name'), parent: 'saturn', radiusKm: 763.5, displayRadius: 0.065, appearance: 'craters', colors: ['#6f7073', '#a9a8a6', '#d9d5c9'] },
    [527200, 0.001, 44.3, 31.5, 0.3, 133.7, 4.517503],
    saturnPole,
  ),
  satellite(
    { id: 'titan', name: message('catalog.moons.titan.name'), parent: 'saturn', radiusKm: 2574.76, displayRadius: 0.11, appearance: 'clouds', colors: ['#8e4b25', '#cf8b43', '#ffe5a5'] },
    [1221900, 0.029, 78.3, 11.7, 0.3, 78.6, 15.945448],
    { rightAscension: 36.4, declination: 84 },
  ),
  satellite(
    { id: 'iapetus', name: message('catalog.moons.iapetus.name'), parent: 'saturn', radiusKm: 734.3, displayRadius: 0.064, appearance: 'rock', colors: ['#453935', '#9a8a7b', '#e6daca'] },
    [3561700, 0.028, 254.5, 74.8, 7.6, 86.5, 79.331002],
    { rightAscension: 288.7, declination: 78.9 },
  ),
  satellite(
    { id: 'miranda', name: message('catalog.moons.miranda.name'), parent: 'uranus', radiusKm: 235.8, displayRadius: 0.045, appearance: 'rock', colors: ['#5c584f', '#a69b88', '#e3d7bf'] },
    [129846, 0.001, 154.8, 73, 4.4, 100.9, 1.413479],
    equator,
  ),
  satellite(
    { id: 'ariel', name: message('catalog.moons.ariel.name'), parent: 'uranus', radiusKm: 578.9, displayRadius: 0.059, appearance: 'rock', colors: ['#68727b', '#aab5bc', '#e2ebe7'] },
    [190929, 0.001, 9.6, 193.5, 0, 0, 2.520379],
    equator,
  ),
  satellite(
    { id: 'umbriel', name: message('catalog.moons.umbriel.name'), parent: 'uranus', radiusKm: 584.7, displayRadius: 0.06, appearance: 'craters', colors: ['#3d3c45', '#686977', '#a2a4ae'] },
    [265986, 0.004, 183.4, 253, 0.1, 174.8, 4.144177],
    equator,
  ),
  satellite(
    { id: 'titania', name: message('catalog.moons.titania.name'), parent: 'uranus', radiusKm: 788.9, displayRadius: 0.07, appearance: 'rock', colors: ['#685953', '#a89183', '#ddc4b5'] },
    [436298, 0.002, 184, 68.1, 0.1, 29.5, 8.705869],
    equator,
  ),
  satellite(
    { id: 'oberon', name: message('catalog.moons.oberon.name'), parent: 'uranus', radiusKm: 761.4, displayRadius: 0.068, appearance: 'craters', colors: ['#413b3e', '#827574', '#b6a6a2'] },
    [583511, 0.002, 132.2, 143.6, 0.1, 76.8, 13.463237],
    equator,
  ),
  satellite(
    {
      id: 'proteus',
      name: message('catalog.moons.proteus.name'),
      parent: 'neptune',
      radiusKm: 208,
      displayRadius: 0.04,
      appearance: 'craters',
      colors: ['#32343d', '#656976', '#9195a4'],
      shape: [1.08, 0.9, 1.03],
      rockySurface: [73, 0.06, 0.59, 0.92],
      silhouette: 'rounded-box',
      note: message('catalog.moons.proteus.surface'),
      sources: [{ label: 'NASA · Proteus', href: 'https://science.nasa.gov/neptune/moons/proteus/' }],
    },
    [117700, 0.001, 357.2, 297.4, 0.6, 355.5, 1.1229],
    equator,
  ),
  satellite(
    { id: 'triton', name: message('catalog.moons.triton.name'), parent: 'neptune', radiusKm: 1353.4, displayRadius: 0.078, appearance: 'rock', colors: ['#7d6968', '#bfa8a3', '#f0e3d7'] },
    [354800, 0, 0, 63, 157.3, 177.7, 5.8792],
    equator,
  ),
];
