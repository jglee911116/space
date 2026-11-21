import { message } from '@/i18n/messages';
import type { FeaturedObject } from '../types';

export const pleiades: FeaturedObject = {
  id: 'm45',
  name: message('catalog.featured-objects.m45.name'),
  designation: message('catalog.featured-objects.m45.designation'),
  description: message('catalog.featured-objects.m45.description'),
  kind: 'open-cluster',
  observationStatus: 'observed',
  distanceLightYears: 445,
  rightAscension: 56.75,
  declination: 24.1167,
  extentLightYears: 20,
  color: '#a2caff',
  aliases: ['Seven Sisters', 'Messier 45'],
  sources: [{ label: 'NASA Hubble · Pleiades', href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-45/' }],
};

export const herculesCluster: FeaturedObject = {
  id: 'm13',
  name: message('catalog.featured-objects.m13.name'),
  designation: message('catalog.featured-objects.m13.designation'),
  description: message('catalog.featured-objects.m13.description'),
  kind: 'globular-cluster',
  observationStatus: 'observed',
  distanceLightYears: 25000,
  rightAscension: 250.4235,
  declination: 36.4613,
  extentLightYears: 145,
  color: '#e8c49c',
  aliases: ['Messier 13'],
  sources: [{ label: 'ESA Hubble · Hercules Globular Cluster', href: 'https://esahubble.org/images/opo0840a/' }],
};
