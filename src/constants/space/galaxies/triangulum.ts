import { message } from '@/i18n/messages';
import type { Galaxy } from '../types';

export const triangulum: Galaxy = {
  id: 'triangulum',
  structure: { arms: 3, winding: 1.69, core: 0.085, dust: 0.44, asymmetry: 0.23 },
  name: message('catalog.triangulum.triangulum.name'),
  title: message('catalog.triangulum.triangulum.title'),
  summary: message('catalog.triangulum.triangulum.summary'),
  distanceKpc: 837,
  skyPosition: { rightAscension: 23.46207, declination: 30.66018 },
  modelRadiusKpc: 9.4,
  color: '#b7c7f4',
  diskTilt: 0.36,
  morphology: 'open-spiral',
  sources: [
    { label: message('catalog.triangulum.triangulum.source.nasa-hubble-m33-distance-and-structure'), href: 'https://science.nasa.gov/asset/hubble/triangulum-galaxy-messier-33-m33/' },
    { label: message('catalog.triangulum.triangulum.source.simbad-m33-position'), href: 'https://simbad.u-strasbg.fr/simbad/sim-id?Ident=Messier+33' },
  ],
};
