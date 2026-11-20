import { message } from '@/i18n/messages';
import type { HostGalaxy } from '../types';

export const milkyWay: HostGalaxy = {
  id: 'milky-way',
  name: message('catalog.milky-way.milky-way.name'),
  summary: message('catalog.milky-way.milky-way.summary'),
  distanceKpc: 0,
  modelRadiusKpc: 15.5,
  color: '#a7bdff',
  sources: [{ label: message('catalog.milky-way.milky-way.source.nasa-galactic-structure'), href: 'https://science.nasa.gov/resource/the-milky-way-galaxy/' }],
  systemId: 'solar',
  neighborhood: {
    name: message('catalog.milky-way.neighborhood.name'),
    summary: message('catalog.milky-way.neighborhood.summary'),
    source: { label: message('catalog.milky-way.milky-way.source.nasa-stars-near-the-sun'), href: 'https://science.nasa.gov/sun/facts/' },
  },
  notes: [message('catalog.milky-way.milky-way.notes')],
  orbitSource: { label: message('catalog.milky-way.milky-way.source.nasa-the-sun-s-galactic-orbit'), href: 'https://science.nasa.gov/sun/facts/' },
  demoYearsPerSecond: 10_000_000,
  center: {
    id: 'sgr-a',
    name: message('catalog.milky-way.sgr-a.name'),
    distanceLightYears: 26_000,
    massSolar: 4_000_000,
    shadowDiameterMicroarcseconds: 51.8,
    sources: [
      {
        label: message('catalog.milky-way.sgr-a.source.nasa-galactic-center'),
        href: 'https://science.nasa.gov/mission/webb/science-overview/science-explainers/what-is-the-center-of-our-galaxy-like/',
      },
      {
        label: message('catalog.milky-way.sgr-a.source.eht-observations'),
        href: 'https://eventhorizontelescope.org/publications/first-sagittarius-event-horizon-telescope-results-i-shadow-supermassive-black-hole',
      },
    ],
  },
};
