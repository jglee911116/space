import { message } from '@/i18n/messages';
import type { Galaxy } from '../types';
import { KPC_PER_MLY } from '../units';

const m81Study = { label: 'Oehm et al. · M81 group coordinates and distances', href: 'https://academic.oup.com/mnras/article/467/1/273/2804510' };
const fornaxImage = { label: 'ESO · Fornax Cluster', href: 'https://www.eso.org/public/images/eso0949c/' };

export const m81Members = [
  {
    id: 'm81',
    structure: { core: 0.29, winding: 3.45, asymmetry: 0.08 },
    name: 'M81',
    title: 'M81 · NGC 3031',
    aliases: ["Bode's Galaxy"],
    summary: message('catalog.nearby-groups.m81.summary'),
    distanceKpc: 11.6 * KPC_PER_MLY,
    skyPosition: { rightAscension: 148.88822, declination: 69.0653 },
    modelRadiusKpc: 14,
    morphology: 'open-spiral',
    color: '#9fbfff',
    sources: [{ label: 'NASA Hubble · M81', href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-81/' }, m81Study],
  },
  {
    id: 'm82',
    structure: { shape: 'spiral', axis: 0.68, thickness: 0.039, arms: 0, bar: 0.3, dust: 1.5, wind: 1 },
    name: 'M82',
    title: 'M82 · NGC 3034',
    aliases: ['Cigar Galaxy'],
    summary: message('catalog.nearby-groups.m82.summary'),
    distanceKpc: 12 * KPC_PER_MLY,
    skyPosition: { rightAscension: 148.96846, declination: 69.6797 },
    modelRadiusKpc: 8,
    morphology: 'barred-irregular',
    diskTilt: -0.36,
    color: '#f5aa85',
    sources: [{ label: 'NASA Hubble · M82', href: 'https://science.nasa.gov/asset/hubble/disk-of-m82/' }, m81Study],
  },
  {
    id: 'ngc-3077',
    structure: { axis: 0.86, core: 0.28, asymmetry: 0.46, dust: 0.64 },
    name: 'NGC 3077',
    summary: message('catalog.nearby-groups.ngc3077.summary'),
    distanceKpc: 3830,
    skyPosition: { rightAscension: 150.82957, declination: 68.73377 },
    modelRadiusKpc: 5,
    morphology: 'irregular',
    color: '#e3c0ff',
    sources: [m81Study],
  },
] satisfies readonly Galaxy[];

export const fornaxMembers = [
  {
    id: 'ngc-1399',
    structure: { axis: 0.92, thickness: 0.85, core: 0.24 },
    name: 'NGC 1399',
    summary: message('catalog.nearby-groups.ngc1399.summary'),
    distanceKpc: 60 * KPC_PER_MLY,
    skyPosition: { rightAscension: 52.12083, declination: -35.45083 },
    modelRadiusKpc: 33,
    morphology: 'giant-elliptical',
    color: '#f0cb90',
    sources: [{ label: 'NASA Chandra · Fornax Cluster', href: 'https://www.chandra.si.edu/photo/2019/fornax/' }, fornaxImage],
  },
  {
    id: 'ngc-1365',
    structure: { bar: 0.52, winding: 1.62, asymmetry: 0.2, dust: 0.95 },
    name: 'NGC 1365',
    aliases: ['Great Barred Spiral Galaxy'],
    summary: message('catalog.nearby-groups.ngc1365.summary'),
    distanceKpc: 56 * KPC_PER_MLY,
    skyPosition: { rightAscension: 53.40155, declination: -36.1404 },
    modelRadiusKpc: 32,
    morphology: 'barred-spiral',
    color: '#a9b6fa',
    sources: [{ label: 'ESA Webb · NGC 1365', href: 'https://esawebb.org/images/weic2403f/' }, fornaxImage],
  },
] satisfies readonly Galaxy[];

const messierCoordinates = { label: 'NASA/IPAC NED · Messier coordinates', href: 'https://ned.ipac.caltech.edu/level5/Condon/' };

export const leoMembers = [
  {
    id: 'm96',
    structure: { bar: 0.21, winding: 3.12, asymmetry: 0.58, dust: 1.04, ring: 0.47 },
    name: 'M96',
    title: 'M96 · NGC 3368',
    summary: message('catalog.nearby-groups.m96.summary'),
    distanceKpc: 35 * KPC_PER_MLY,
    skyPosition: { rightAscension: 161.6875, declination: 11.82111 },
    modelRadiusKpc: 14,
    morphology: 'open-spiral',
    color: '#adc9ff',
    sources: [{ label: 'NASA Hubble · M96', href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-96/' }, messierCoordinates],
  },
  {
    id: 'm95',
    structure: { bar: 0.34, winding: 2.66, ring: 0.36, dust: 0.6 },
    name: 'M95',
    title: 'M95 · NGC 3351',
    summary: message('catalog.nearby-groups.m95.summary'),
    distanceKpc: 33 * KPC_PER_MLY,
    skyPosition: { rightAscension: 160.99167, declination: 11.70417 },
    modelRadiusKpc: 14,
    morphology: 'barred-spiral',
    color: '#e9c197',
    sources: [{ label: 'NASA Hubble · M95', href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-95/' }, messierCoordinates],
  },
  {
    id: 'm105',
    structure: { axis: 0.94, thickness: 0.85, core: 0.14 },
    name: 'M105',
    title: 'M105 · NGC 3379',
    summary: message('catalog.nearby-groups.m105.summary'),
    distanceKpc: 32 * KPC_PER_MLY,
    skyPosition: { rightAscension: 161.95833, declination: 12.5825 },
    modelRadiusKpc: 14,
    morphology: 'giant-elliptical',
    color: '#f3dbab',
    sources: [{ label: 'NASA Hubble · M105', href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-105/' }, messierCoordinates],
  },
] satisfies readonly Galaxy[];

export const hydraSurvey = { label: 'WALLABY · Hydra I', href: 'https://academic.oup.com/mnras/article/510/2/1716/6449389' };
const hydraDistance = { label: 'Hydra I · Adopted distance modulus', href: 'https://doi.org/10.1051/0004-6361/201116728' };
const hydraCoordinates = { label: 'CDS SIMBAD · NGC 3309 and NGC 3311', href: 'https://simbad.idia.ac.za/simbad/sim-ref?bibcode=2008ApJ...681.1233W&simbo=on' };
const hydraDistanceKpc = 47_200;

export const hydraMembers = [
  {
    id: 'ngc-3311',
    structure: { axis: 0.98, thickness: 0.9, core: 0.32 },
    name: 'NGC 3311',
    summary: message('catalog.nearby-groups.ngc3311.summary'),
    distanceKpc: hydraDistanceKpc,
    skyPosition: { rightAscension: 159.17842, declination: -27.52834 },
    modelRadiusKpc: 29,
    morphology: 'giant-elliptical',
    color: '#f1cea0',
    sources: [hydraSurvey, hydraDistance, hydraCoordinates],
  },
  {
    id: 'ngc-3309',
    structure: { axis: 0.78, thickness: 0.69, core: 0.16 },
    name: 'NGC 3309',
    summary: message('catalog.nearby-groups.ngc3309.summary'),
    distanceKpc: hydraDistanceKpc,
    skyPosition: { rightAscension: 159.14859, declination: -27.51826 },
    modelRadiusKpc: 17,
    morphology: 'giant-elliptical',
    color: '#bfc8ff',
    sources: [hydraSurvey, hydraDistance, hydraCoordinates],
  },
] satisfies readonly Galaxy[];
