import { message } from '@/i18n/messages';
import type { HostGalaxy } from '../types';

export const milkyWay: HostGalaxy = {
  id: 'milky-way',
  name: message('catalog.milky-way.milky-way.name'),
  summary: message('catalog.milky-way.milky-way.summary'),
  distanceKpc: 0,
  modelRadiusKpc: 15.5,
  morphology: 'barred-spiral',
  color: '#a7bdff',
  diskObservation: {
    file: '/textures/galaxies/milky-way/disk-spitzer.jpg',
    previewFile: '/textures/galaxies/milky-way/disk-spitzer-preview.jpg',
    center: [0.496, 0.50],
    span: [0.49, 0.49],
    rotation: 1.05,
  },
  sources: [
    { label: message('catalog.milky-way.milky-way.source.nasa-galactic-structure'), href: 'https://science.nasa.gov/resource/the-milky-way-galaxy/' },
    { label: 'NASA/JPL-Caltech · Spitzer reconstruction (PIA10748)', href: 'https://science.nasa.gov/photojournal/our-milky-way-gets-a-makeover-artist-concept/' },
  ],
  systemId: 'solar',
  neighborhood: {
    name: message('catalog.milky-way.neighborhood.name'),
    summary: message('catalog.milky-way.neighborhood.summary'),
    source: { label: message('catalog.milky-way.milky-way.source.nasa-stars-near-the-sun'), href: 'https://science.nasa.gov/sun/facts/' },
  },
  notes: [message('catalog.milky-way.milky-way.notes'), message('catalog.milky-way.milky-way.diskNote')],
  orbitSource: { label: message('catalog.milky-way.milky-way.source.nasa-the-sun-s-galactic-orbit'), href: 'https://science.nasa.gov/sun/facts/' },
  demoYearsPerSecond: 10_000_000,
  center: {
    id: 'sgr-a',
    name: message('catalog.milky-way.sgr-a.name'),
    distanceLightYears: 26_000,
    massSolar: 4_000_000,
    shadowDiameterMicroarcseconds: 51.8,
    observationMaps: {
      intensity: '/textures/galaxies/milky-way/objects/sgr-a/eht-2022.jpg',
      polarization: '/textures/galaxies/milky-way/objects/sgr-a/eht-polarized-2024.jpg',
    },
    sources: [
      { label: 'EHT Collaboration · 2022', href: 'https://www.eso.org/public/images/eso2208-eht-mwa/' },
      { label: 'EHT Collaboration · 2024', href: 'https://www.eso.org/public/images/eso2406a/' },
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
