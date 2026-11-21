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

export const omegaCentauri: FeaturedObject = {
  id: 'ngc-5139',
  name: message('catalog.featured-objects.ngc-5139.name'),
  designation: 'NGC 5139 · Caldwell 80',
  aliases: ['Omega Centauri', 'Omega Cen', 'ω Cen', 'C80', '오메가 센타우리'],
  description: message('catalog.featured-objects.ngc-5139.description'),
  kind: 'globular-cluster',
  observationStatus: 'observed',
  distanceLightYears: 17000,
  rightAscension: 201.69279,
  declination: -47.47368,
  extentLightYears: 150,
  color: '#f0d3af',
  sources: [{ label: 'ESA/Hubble · Omega Centauri', href: 'https://esahubble.org/images/heic0809a/' }],
};

export const tucanae47: FeaturedObject = {
  id: 'ngc-104', name: message('catalog.new.ngc-104.name'), designation: 'NGC 104 · Caldwell 106',
  aliases: ['47 Tuc', '47 Tucanae', 'C106', '큰부리새자리 47'],
  description: message('catalog.new.ngc-104.summary'), kind: 'globular-cluster', observationStatus: 'observed',
  distanceLightYears: 16700, rightAscension: 6.02233, declination: -72.08144, extentLightYears: 120, color: '#f2d6ac',
  sources: [{ label: 'NASA Hubble · 47 Tucanae', href: 'https://science.nasa.gov/asset/hubble/globular-cluster-47-tucanae-2/' }],
};
