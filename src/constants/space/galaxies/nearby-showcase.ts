import { message } from '@/i18n/messages';
import type { Galaxy } from '../types';
import { KPC_PER_MLY } from '../units';


export const whirlpoolSource = {
  label: 'NASA Hubble · M51 and NGC 5195',
  href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-51/',
};

export const whirlpoolMembers = [
  {
    id: 'm51',
    name: message('catalog.nearby-showcase.m51.name'),
    title: 'M51 · NGC 5194',
    aliases: ['Messier 51'],
    summary: message('catalog.nearby-showcase.m51.summary'),
    distanceKpc: 31 * KPC_PER_MLY,
    skyPosition: { rightAscension: 202.4696, declination: 47.1952 },
    modelRadiusKpc: 17,
    morphology: 'open-spiral',
    color: '#9cbaff',
    diskObservation: { file: '/textures/galaxies/m51/disk-hubble.webp', center: [0.392, 0.51], span: [0.40, 0.54] },
    sources: [
      { label: 'NASA, ESA, S. Beckwith (STScI), the Hubble Heritage Team (STScI/AURA) · CC BY 4.0', href: 'https://esahubble.org/images/heic0506a/' },
      whirlpoolSource,
    ],
  },
  {
    id: 'ngc-5195',
    structure: { axis: 0.74, core: 0.24, asymmetry: 0.63, dust: 0.66 },
    name: 'NGC 5195',
    aliases: ['M51b', 'M51 B'],
    summary: message('catalog.nearby-showcase.ngc5195.summary'),
    distanceKpc: 31 * KPC_PER_MLY,
    skyPosition: { rightAscension: 202.4983, declination: 47.2661 },
    modelRadiusKpc: 6,
    morphology: 'irregular',
    color: '#f0cc89',
    sources: [whirlpoolSource],
  },
] satisfies readonly Galaxy[];

export const nearbyShowcase = [
  {
    id: 'm94', name: 'M94 · NGC 4736', aliases: ['M 94', 'Messier 94', 'NGC 4736'],
    summary: message('catalog.next.m94.summary'), superclusterId: 'virgo',
    distanceKpc: 16 * KPC_PER_MLY, skyPosition: { rightAscension: 192.721, declination: 41.121 },
    modelRadiusKpc: 15, morphology: 'open-spiral', diskTilt: 0.43, color: '#e3bb94',
    structure: { winding: 2.05, ring: 0.21, core: 0.12, asymmetry: 0.17, dust: 0.55 },
    diskObservation: { file: '/textures/galaxies/m94/hubble.webp', previewFile: '/textures/galaxies/m94/hubble.webp',
      center: [0.49, 0.51], span: [1.3, 1.3], blendProcedural: true },
    sources: [{ label: 'ESA/Hubble & NASA · Messier 94', href: 'https://esahubble.org/images/potw1542a/' }],
  },
  {
    id: 'ngc-1512', name: 'NGC 1512', summary: message('catalog.additions.ngc1512.summary'), superclusterId: 'virgo',
    distanceKpc: 30 * KPC_PER_MLY, skyPosition: { rightAscension: 60.97617, declination: -43.34886 },
    modelRadiusKpc: 13, morphology: 'barred-spiral', diskTilt: 0.70, color: '#ecb88c',
    structure: { winding: 1.8, bar: 0.52, ring: 0.24, core: 0.14, asymmetry: 0.28 },
    diskObservation: { file: '/textures/galaxies/ngc-1512/webb.webp', previewFile: '/textures/galaxies/ngc-1512/webb.webp', center: [0.52, 0.49], span: [0.52, 0.80], blendProcedural: true },
    sources: [{ label: 'NASA, ESA, CSA, STScI & PHANGS · Webb', href: 'https://esawebb.org/images/weic2403i/' }],
  },
  {
    id: 'ngc-1566', name: 'NGC 1566', aliases: ['Spanish Dancer Galaxy', '스페인 무희 은하'],
    structure: { winding: -1.65, phase: -1.95, axis: 0.96, core: 0.16 },
    summary: message('catalog.nearby-showcase.ngc-1566.summary'), superclusterId: 'virgo',
    distanceKpc: 17700, skyPosition: { rightAscension: 65.00159, declination: -54.93801 },
    modelRadiusKpc: 18.5, diskTilt: 0.76, morphology: 'open-spiral', color: '#ecad7c',
    diskObservation: { file: '/textures/galaxies/ngc-1566/webb.webp', previewFile: '/textures/galaxies/ngc-1566/webb.webp', center: [0.486, 0.48], span: [1.57, 0.96], blendProcedural: true },
    sources: [
      { label: 'NASA, ESA, CSA, STScI & PHANGS · Webb · CC BY 4.0', href: 'https://esawebb.org/images/weic2403j/' },
      { label: 'PHANGS–MUSE · Distance and disc parameters', href: 'https://academic.oup.com/mnras/article/520/4/4902/6987280' },
    ],
  },
  {
    id: 'ngc-253',
    structure: { axis: 0.72, thickness: 0.047, core: 0.16, dust: 1.2, winding: 3.15 },
    name: message('catalog.nearby-showcase.ngc253.name'),
    title: 'NGC 253 · Caldwell 65',
    aliases: ['Silver Dollar Galaxy'],
    summary: message('catalog.nearby-showcase.ngc253.summary'),
    superclusterId: 'virgo',
    distanceKpc: 11 * KPC_PER_MLY,
    skyPosition: { rightAscension: 11.888, declination: -25.2883 },
    modelRadiusKpc: 16,
    diskTilt: -0.3,
    morphology: 'open-spiral',
    color: '#e2bca3',
    sources: [{ label: 'ESO · NGC 253', href: 'https://www.eso.org/public/news/eso2510/' }],
  },
  {
    id: 'centaurus-a',
    structure: { axis: 0.84, thickness: 0.69, dust: 2.25 },
    name: message('catalog.nearby-showcase.centaurus-a.name'),
    title: 'Centaurus A · NGC 5128',
    aliases: ['Cen A', 'Caldwell 77'],
    summary: message('catalog.nearby-showcase.centaurus-a.summary'),
    superclusterId: 'virgo',
    distanceKpc: 11 * KPC_PER_MLY,
    skyPosition: { rightAscension: 201.3651, declination: -43.0191 },
    modelRadiusKpc: 27,
    morphology: 'dust-lane-elliptical',
    color: '#e9bf90',
    sources: [{ label: 'ESA Webb · Centaurus A', href: 'https://esawebb.org/news/weic2615/' }],
  },
] satisfies readonly Galaxy[];
