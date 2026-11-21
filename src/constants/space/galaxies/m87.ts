import { message } from '@/i18n/messages';
import type { Galaxy } from '../types';

export const m87: Galaxy = {
  id: 'm87',
  structure: { axis: 0.95, thickness: 0.81, core: 0.19 },
  name: message('catalog.m87.m87.name'),
  title: message('catalog.m87.m87.title'),
  summary: message('catalog.m87.m87.summary'),
  distanceKpc: 16_560,
  skyPosition: { rightAscension: 187.70592, declination: 12.39112 },
  modelRadiusKpc: 43,
  morphology: 'giant-elliptical',
  color: '#f3d6ad',
  sources: [{ label: message('catalog.m87.m87.source.nasa-hubble-messier-87'), href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-87/' }],
};
