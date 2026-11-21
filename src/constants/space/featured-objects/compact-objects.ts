import { message } from '@/i18n/messages';
import type { FeaturedObject } from '../types';

export const velaPulsar: FeaturedObject = {
  id: 'vela-pulsar',
  name: message('catalog.featured-objects.vela-pulsar.name'),
  designation: 'PSR B0833−45 · PSR J0835−4510',
  aliases: ['Vela Pulsar', 'PSR B0833-45', 'PSR J0835-4510', '돛자리 펄서'],
  description: message('catalog.featured-objects.vela-pulsar.description'),
  kind: 'pulsar-wind-nebula',
  observationStatus: 'observed',
  distanceLightYears: 1000,
  rightAscension: 128.835833,
  declination: -45.176389,
  extentLightYears: 1.8,
  spinSeconds: 0.089,
  color: '#72bdff',
  observationImage: { file: '/textures/nebulae/pulsar-wind/vela-pulsar/chandra.jpg', shape: 'vela-wind', telescope: 'chandra' },
  sources: [
    { label: 'NASA/CXC/Univ. of Toronto/M. Durant et al. · X-ray time series', href: 'https://chandra.si.edu/photo/2013/vela/' },
    { label: 'Chandra · Vela Pulsar in 3D', href: 'https://chandra.si.edu/deadstar/vela.html' },
  ],
};

export const cygnusX1: FeaturedObject = {
  id: 'cygnus-x-1',
  name: message('catalog.featured-objects.cygnus-x-1.name'),
  designation: 'Cygnus X-1 · HDE 226868',
  aliases: ['Cyg X-1', 'Cygnus X-1', '백조자리 X1'],
  description: message('catalog.featured-objects.cygnus-x-1.description'),
  kind: 'x-ray-binary',
  observationStatus: 'observed',
  distanceLightYears: 7240,
  rightAscension: 299.590316,
  declination: 35.201607,
  extentLightYears: 0.000011,
  blackHoleMassSolar: 21.2,
  color: '#a6caff',
  accretionDisk: { rate: 1.24, width: 0.1, contrast: 0.82 },
  sources: [
    { label: 'Miller-Jones et al. · Cygnus X-1 radio astrometry', href: 'https://doi.org/10.1126/science.abb3363' },
    { label: 'Chandra · Cygnus X-1', href: 'https://chandra.si.edu/photo/2011/cygx1/' },
  ],
};

export const j0740Pulsar: FeaturedObject = {
  id: 'psr-j0740-6620',
  name: message('catalog.featured-objects.psr-j0740-6620.name'),
  designation: message('catalog.featured-objects.psr-j0740-6620.designation'),
  description: message('catalog.featured-objects.psr-j0740-6620.description'),
  kind: 'pulsar',
  observationStatus: 'observed',
  distanceLightYears: 3600,
  rightAscension: 115.19083,
  declination: 66.34267,
  extentLightYears: 0,
  color: '#9dd2ff',
  aliases: ['J0740+6620'],
  spinSeconds: 0.0028857,
  radiusKm: 12.49,
  radiusBasis: 'estimate',
  sources: [
    { label: 'NICER / XMM-Newton · PSR J0740+6620', href: 'https://doi.org/10.3847/1538-4357/ad5f1f' },
    { label: 'NASA Fermi · Timing and coordinates', href: 'https://fermi.gsfc.nasa.gov/ssc/data/access/lat/3rd_PSR_catalog/3PC_HTML/J0740%2B6620.html' },
    { label: 'NASA NICER · Distance', href: 'https://www.nasa.gov/universe/nasas-nicer-probes-the-squeezability-of-neutron-stars/' },
  ],
};

export const crabPulsar: FeaturedObject = {
  id: 'crab-pulsar',
  parentObjectId: 'crab-nebula',
  name: message('catalog.featured-objects.crab-pulsar.name'),
  designation: message('catalog.featured-objects.crab-pulsar.designation'),
  description: message('catalog.featured-objects.crab-pulsar.description'),
  kind: 'pulsar',
  observationStatus: 'observed',
  distanceLightYears: 6500,
  rightAscension: 83.63308,
  declination: 22.0145,
  extentLightYears: 0,
  radiusKm: 10,
  radiusBasis: 'model-assumption',
  spinSeconds: 0.033,
  color: '#a4d8ff',
  sources: [
    { label: message('catalog.featured-objects.crab-pulsar.source.nasa-nicer-rotation-period'), href: 'https://heasarc.gsfc.nasa.gov/docs/nicer/science_nuggets/20200402.html' },
    { label: message('catalog.featured-objects.crab-pulsar.source.webb-wisps'), href: 'https://science.nasa.gov/asset/webb/crab-nebula-nircam-and-miri-image/' },
    { label: message('catalog.featured-objects.crab-pulsar.source.crab-pulsar-emission-model-assumed-radius'), href: 'https://doi.org/10.1017/S002237781600043Xa' },
  ],
};

export const rxJ1856: FeaturedObject = {
  id: 'rx-j1856-5-3754',
  name: 'RX J1856.5−3754',
  designation: message('catalog.featured-objects.rx-j1856.designation'),
  description: message('catalog.featured-objects.rx-j1856.description'),
  kind: 'neutron-star',
  thermalSurface: true,
  observationStatus: 'observed',
  distanceLightYears: 401,
  rightAscension: 284.14836,
  declination: -37.91,
  extentLightYears: 0,
  spinSeconds: 7.055,
  color: '#9bcfff',
  sources: [
    { label: message('catalog.featured-objects.rx-j1856.parallax'), href: 'https://arxiv.org/abs/1008.1709' },
    { label: message('catalog.featured-objects.rx-j1856.pulsations'), href: 'https://arxiv.org/abs/astro-ph/0612501' },
  ],
};

export const sgr1806: FeaturedObject = {
  id: 'sgr-1806-20',
  name: 'SGR 1806−20',
  designation: message('catalog.featured-objects.sgr-1806.designation'),
  description: message('catalog.featured-objects.sgr-1806.description'),
  kind: 'magnetar',
  observationStatus: 'observed',
  distanceLightYears: 28_400,
  rightAscension: 272.1639,
  declination: -20.4111,
  extentLightYears: 0,
  spinSeconds: 7.55,
  color: '#db9cff',
  sources: [
    { label: message('catalog.featured-objects.sgr-1806.catalog'), href: 'https://www.physics.mcgill.ca/~pulsar/magnetar/v160321/main' },
    { label: message('catalog.featured-objects.sgr-1806.distance'), href: 'https://academic.oup.com/mnrasl/article/386/1/L23/1124188' },
    { label: message('catalog.featured-objects.sgr-1806.flare'), href: 'https://doi.org/10.1088/0004-637X/761/1/76' },
  ],
};

export const m87Star: FeaturedObject = {
  id: 'm87-star',
  name: 'M87*',
  designation: message('catalog.featured-objects.m87-star.designation'),
  description: message('catalog.featured-objects.m87-star.description'),
  kind: 'black-hole',
  observationStatus: 'observed',
  galaxyId: 'm87',
  distanceLightYears: 55_000_000,
  rightAscension: 187.70592,
  declination: 12.39112,
  extentLightYears: 0.017,
  blackHoleMassSolar: 6.5e9,
  color: '#ffc386',
  accretionDisk: { rate: 0.46, width: 0.092, contrast: 0.88, observationMap: '/textures/black-holes/m87-star/eht-ring.jpg' },
  sources: [
    {
      label: message('catalog.featured-objects.m87-star.source.eht-first-black-hole-image'),
      href: 'https://eso.org/public/images/eso1907a/',
    },
    { label: message('catalog.featured-objects.m87-star.source.nasa-hubble-m87-jet'), href: 'https://science.nasa.gov/asset/hubble/optical-jet-in-galaxy-m87/' },
    { label: message('catalog.featured-objects.m87-star.source.vlba-helical-jet'), href: 'https://academic.oup.com/mnras/article/526/4/5949/7303302' },
    { label: message('catalog.featured-objects.m87-star.source.jwst-counterjet'), href: 'https://doi.org/10.1051/0004-6361/202556577' },
  ],
};
