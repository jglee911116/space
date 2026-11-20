import { message } from '@/i18n/messages';
import type { Galaxy } from '../types';

const COORDINATES = {
  label: message('catalog.andromeda-satellites.coordinates.source.simbad-satellite-galaxy-positions'),
  href: 'https://simbad.idia.ac.za/simbad/sim-ref?bibcode=2009MNRAS.397.1816P&simbo=on',
};

export const messier32: Galaxy = {
  id: 'm32',
  name: message('catalog.andromeda-satellites.m32.name'),
  title: message('catalog.andromeda-satellites.m32.title'),
  parentGalaxyId: 'andromeda',
  summary: message('catalog.andromeda-satellites.m32.summary'),
  distanceKpc: 770,
  skyPosition: { rightAscension: 10.67427, declination: 40.86517 },
  modelRadiusKpc: 0.7,
  morphology: 'compact-elliptical',
  color: '#ffe1b4',
  sources: [
    {
      label: message('catalog.andromeda-satellites.m32.source.nasa-hubble-messier-32'),
      href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-32/',
    },
    COORDINATES,
  ],
};

export const messier110: Galaxy = {
  id: 'm110',
  name: message('catalog.andromeda-satellites.m110.name'),
  title: message('catalog.andromeda-satellites.m110.title'),
  parentGalaxyId: 'andromeda',
  summary: message('catalog.andromeda-satellites.m110.summary'),
  distanceKpc: 825,
  skyPosition: { rightAscension: 10.09191, declination: 41.68542 },
  modelRadiusKpc: 2.7,
  morphology: 'dwarf-elliptical',
  color: '#d4c0e5',
  sources: [
    {
      label: message('catalog.andromeda-satellites.m110.source.nasa-hubble-messier-110'),
      href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-110/',
    },
    COORDINATES,
  ],
};
