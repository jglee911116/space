import { message } from '@/i18n/messages';
import type { Body } from '../../types';

const epoch = 2_461_200.5;
const periodDays = 1679.853119758983;
const ascendingNode = 80.24862682043221;
const perihelionLongitude = ascendingNode + 73.29421453021587;

export const ceres: Body = {
  id: 'ceres',
  name: message('catalog.ceres.name'),
  kind: 'dwarf-planet',
  parent: 'sun',
  radiusKm: 476,
  spinDays: 9.074 / 24,
  tilt: 4,
  displayRadius: 0.12,
  appearance: 'rock',
  colors: ['#544d48', '#898078', '#c0b5aa'],
  orbit: {
    axisAu: 2.765552595034094,
    eccentricity: 0.07969229514816586,
    inclination: 10.58802780183462,
    ascendingNode,
    perihelionLongitude,
    meanLongitude: perihelionLongitude + 274.4193463761342 - ((epoch - 2_451_545) * 360) / periodDays,
    periodDays,
  },
  note: message('catalog.ceres.note'),
  surfaceMap: { file: '/textures/star-systems/solar/dwarf-planets/ceres/ceres-dawn.webp', fillMissing: true },
  sources: [
    { label: 'NASA · Ceres', href: 'https://science.nasa.gov/dwarf-planets/ceres/facts/' },
    { label: 'JPL Small-Body Database · 1 Ceres', href: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=1' },
    { label: 'NASA/JPL-Caltech/UCLA/MPS/DLR/IDA · Dawn HAMO', href: 'https://dawngis.dlr.de/data/Ceres/mosaic_ceres.php' },
  ],
};
