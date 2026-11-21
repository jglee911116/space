import { message } from '@/i18n/messages';
import type { FeaturedObject } from '../../types';

export const ringNebula: FeaturedObject = {
  id: 'm57',
  name: message('catalog.featured-objects.m57.name'),
  designation: message('catalog.featured-objects.m57.designation'),
  description: message('catalog.featured-objects.m57.description'),
  kind: 'planetary-nebula',
  observationStatus: 'observed',
  distanceLightYears: 2300,
  rightAscension: 283.396,
  declination: 33.029,
  extentLightYears: 1.6,
  color: '#71c9c3',
  aliases: ['Messier 57'],
  observationImage: { file: '/textures/nebulae/planetary/m57/webb.jpg', shape: 'ring' },
  sources: [
    { label: 'ESA/Webb, NASA, CSA, M. Barlow, N. Cox, R. Wesson · CC BY 4.0', href: 'https://esawebb.org/images/weic2320b/' },
    { label: 'NASA Hubble · Ring Nebula', href: 'https://science.nasa.gov/asset/hubble/the-ring-nebula-m57/' },
  ],
};

export const pillarsOfCreation: FeaturedObject = {
  id: 'pillars-of-creation',
  name: message('catalog.featured-objects.pillars-of-creation.name'),
  designation: message('catalog.featured-objects.pillars-of-creation.designation'),
  description: message('catalog.featured-objects.pillars-of-creation.description'),
  kind: 'pillars',
  observationStatus: 'observed',
  distanceLightYears: 6500,
  rightAscension: 274.71,
  declination: -13.82,
  extentLightYears: 5,
  color: '#e5a176',
  observationImage: { file: '/textures/nebulae/star-forming/pillars-of-creation/webb.jpg', shape: 'pillars' },
  sources: [
    { label: 'NASA, ESA, CSA, STScI, J. DePasquale, A. Koekemoer, A. Pagan · CC BY 4.0', href: 'https://esawebb.org/images/weic2216a/' },
    { label: message('catalog.featured-objects.pillars-of-creation.source.nasa-pillars-of-creation-observations'), href: 'https://science.nasa.gov/asset/hubble/eagle-nebula-pillars-of-creation/' },
    { label: message('catalog.featured-objects.pillars-of-creation.source.nasa-3d-model-of-the-pillars'), href: 'https://science.nasa.gov/3d-resources/pillars-of-creation/' },
  ],
};

export const crabNebula: FeaturedObject = {
  id: 'crab-nebula',
  name: message('catalog.featured-objects.crab-nebula.name'),
  designation: 'M1 · NGC 1952',
  aliases: ['Crab Pulsar', '게 펄서', 'PSR B0531+21', 'crab-pulsar'],
  description: message('catalog.featured-objects.crab-nebula.description'),
  kind: 'supernova-remnant',
  observationStatus: 'observed',
  expansionPerYear: 0.00135,
  distanceLightYears: 6500,
  rightAscension: 83.63308,
  declination: 22.0145,
  extentLightYears: 6,
  color: '#70cddd',
  observationImage: { file: '/textures/nebulae/supernova-remnants/crab-nebula/webb.jpg', shape: 'crab' },
  sources: [
    { label: 'NASA, ESA, CSA, STScI, T. Temim (Princeton University) · CC BY 4.0', href: 'https://esawebb.org/images/weic2326a/' },
    { label: message('catalog.featured-objects.crab-nebula.source.nasa-crab-nebula-observations'), href: 'https://science.nasa.gov/asset/hubble/crab-nebula-2/' },
    { label: message('catalog.featured-objects.crab-nebula.source.nasa-crab-pulsar-and-jets'), href: 'https://science.nasa.gov/3d-resources/crab-nebula/' },
    { label: message('catalog.featured-objects.crab-nebula.source.crab-nebula-expansion-study'), href: 'https://doi.org/10.1093/MNRAS/STV2112' },
  ],
};

export const sn1987a: FeaturedObject = {
  id: 'sn-1987a',
  name: 'SN 1987A',
  designation: message('catalog.featured-objects.sn-1987a.designation'),
  description: message('catalog.featured-objects.sn-1987a.description'),
  kind: 'ring-remnant',
  observationStatus: 'observed',
  expansionPerYear: 1 / 35,
  galaxyId: 'large-magellanic-cloud',
  distanceLightYears: 168_000,
  rightAscension: 83.86771,
  declination: -69.27028,
  extentLightYears: 2.6,
  color: '#f9a473',
  observationImage: { file: '/textures/nebulae/supernova-remnants/sn-1987a/webb.jpg', shape: 'ejecta' },
  sources: [
    { label: 'NASA, ESA, CSA, M. Matsuura, R. Arendt, C. Fransson, J. Larsson, A. Pagan (STScI) · CC BY 4.0', href: 'https://esawebb.org/images/SN1987a-1/' },
    { label: message('catalog.featured-objects.sn-1987a.source.nasa-webb-sn-1987a'), href: 'https://science.nasa.gov/missions/webb/webb-reveals-new-structures-within-iconic-supernova/' },
    { label: message('catalog.featured-objects.sn-1987a.source.nasa-hubble-equatorial-ring'), href: 'https://science.nasa.gov/asset/hubble/supernova-1987a-2/' },
    { label: message('catalog.featured-objects.sn-1987a.source.sn-1987a-inner-ejecta-expansion-study'), href: 'https://doi.org/10.3847/1538-4357/ad36cc' },
  ],
};

export const ngc604: FeaturedObject = {
  id: 'ngc-604',
  name: 'NGC 604',
  designation: message('catalog.featured-objects.ngc-604.designation'),
  description: message('catalog.featured-objects.ngc-604.description'),
  kind: 'star-forming-region',
  observationStatus: 'observed',
  galaxyId: 'triangulum',
  distanceLightYears: 2_730_000,
  rightAscension: 23.64079,
  declination: 30.78306,
  extentLightYears: 1300,
  color: '#f3a787',
  observationImage: { file: '/textures/nebulae/star-forming/ngc-604/webb.jpg', shape: 'nursery' },
  sources: [
    { label: 'NASA, ESA, CSA, STScI · CC BY 4.0', href: 'https://esawebb.org/images/weic2407a/' },
    { label: message('catalog.featured-objects.ngc-604.source.nasa-webb-ngc-604'), href: 'https://science.nasa.gov/missions/webb/peering-into-the-tendrils-of-ngc-604-with-nasas-webb/' },
    { label: message('catalog.featured-objects.ngc-604.source.nasa-webb-position-and-scale'), href: 'https://science.nasa.gov/asset/webb/ngc-604-nircam-compass-image/' },
  ],
};

export const orionNebula: FeaturedObject = {
  id: 'orion-nebula',
  name: message('catalog.featured-objects.orion-nebula.name'),
  designation: message('catalog.featured-objects.orion-nebula.designation'),
  description: message('catalog.featured-objects.orion-nebula.description'),
  kind: 'star-forming-region',
  observationStatus: 'observed',
  distanceLightYears: 1500,
  rightAscension: 83.82204,
  declination: -5.41361,
  extentLightYears: 24,
  color: '#dda9ec',
  // 트라페지움 성단.
  embeddedCluster: [
    [-0.13, 0.07, 0.13],
    [0.09, 0.15, 0.16],
    [0.14, -0.07, 0.1],
    [-0.06, -0.11, 0.14],
  ],
  observationImage: { file: '/textures/nebulae/star-forming/orion-nebula/webb.jpg', shape: 'nursery' },
  sources: [
    { label: 'ESA/Webb, NASA, CSA, M. Zamani, PDRs4All ERS Team · CC BY 4.0', href: 'https://esawebb.org/images/weic2315b/' },
    { label: message('catalog.featured-objects.orion-nebula.source.nasa-hubble-orion-nebula-and-trapezium'), href: 'https://science.nasa.gov/asset/hubble/orion-nebula/' },
  ],
};
