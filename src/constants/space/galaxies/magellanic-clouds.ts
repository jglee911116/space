import { message } from '@/i18n/messages';
import type { Galaxy } from '../types';

const coordinates = { label: message('catalog.magellanic-clouds.coordinates.source.simbad-magellanic-cloud-positions'), href: 'https://aladin.cds.unistra.fr/simbad-thumbnails/thumbnails1.html' };

export const largeMagellanicCloud: Galaxy = {
  id: 'large-magellanic-cloud',
  structure: { axis: 0.80, bar: 0.37, asymmetry: 0.45 },
  name: message('catalog.magellanic-clouds.large-magellanic-cloud.name'),
  title: message('catalog.magellanic-clouds.large-magellanic-cloud.title'),
  summary: message('catalog.magellanic-clouds.large-magellanic-cloud.summary'),
  distanceKpc: 49,
  skyPosition: { rightAscension: 80.89417, declination: -69.75611 },
  modelRadiusKpc: 4.5,
  color: '#ffc6ac',
  diskTilt: 0.43,
  morphology: 'barred-irregular',
  sources: [
    { label: message('catalog.magellanic-clouds.large-magellanic-cloud.source.nasa-large-magellanic-cloud'), href: 'https://science.nasa.gov/earth/earth-observatory/the-galaxy-next-door/' },
    coordinates,
  ],
};

export const smallMagellanicCloud: Galaxy = {
  id: 'small-magellanic-cloud',
  structure: { axis: 0.57, thickness: 0.25, asymmetry: 0.55 },
  name: message('catalog.magellanic-clouds.small-magellanic-cloud.name'),
  title: message('catalog.magellanic-clouds.small-magellanic-cloud.title'),
  summary: message('catalog.magellanic-clouds.small-magellanic-cloud.summary'),
  distanceKpc: 63.2,
  skyPosition: { rightAscension: 13.15833, declination: -72.80028 },
  modelRadiusKpc: 2.8,
  color: '#ccbbf5',
  diskTilt: 0.66,
  morphology: 'irregular',
  sources: [{ label: message('catalog.magellanic-clouds.small-magellanic-cloud.source.nasa-small-magellanic-cloud'), href: 'https://science.nasa.gov/universe/glossary/' }, coordinates],
};
