import { message } from '@/i18n/messages';
import type { Body } from '../../types';

const epoch = 2_455_562.5;
const periodDays = 436.6487281120201;
const ascendingNode = 2.06086619569642;
const perihelionLongitude = ascendingNode + 66.22306084084298;

export const bennu: Body = {
  id: 'bennu',
  name: message('catalog.bennu.name'),
  aliases: ['101955', '101955 Bennu', '1999 RQ36'],
  kind: 'small-body',
  parent: 'sun',
  radiusKm: 0.48444 / 2,
  spinDays: 4.296061 / 24,
  tilt: 177.6,
  displayRadius: 0.085,
  appearance: 'rock',
  colors: ['#3c3733', '#746b60', '#afa595'],
  orbit: {
    axisAu: 1.126391025894812,
    eccentricity: 0.2037450762416414,
    inclination: 6.03494377024794,
    ascendingNode,
    perihelionLongitude,
    meanLongitude: perihelionLongitude + 101.703952002457 - ((epoch - 2_451_545) * 360) / periodDays,
    periodDays,
  },
  shapeModel: '/models/star-systems/solar/small-bodies/bennu/bennu-nasa.glb',
  note: message('catalog.bennu.note'),
  sources: [
    { label: 'NASA · Bennu', href: 'https://science.nasa.gov/solar-system/asteroids/101955-bennu/facts/' },
    { label: 'JPL Small-Body Database · 101955 Bennu', href: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=101955' },
    { label: 'NASA VTAD · Bennu 3D Model', href: 'https://science.nasa.gov/resource/bennu-3d-model/' },
  ],
};
