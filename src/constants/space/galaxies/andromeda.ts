import { message } from '@/i18n/messages';
import type { Galaxy } from '../types';

export const andromeda: Galaxy = {
  id: 'andromeda',
  name: message('catalog.andromeda.andromeda.name'),
  title: message('catalog.andromeda.andromeda.title'),
  summary: message('catalog.andromeda.andromeda.summary'),
  distanceKpc: 770,
  skyPosition: { rightAscension: 10.68333, declination: 41.26917 },
  modelRadiusKpc: 34,
  color: '#ecd1aa',
  diskTilt: -0.12,
  diskObservation: { file: '/textures/galaxies/andromeda/disk-wise.webp', previewFile: '/textures/galaxies/andromeda/disk-wise-preview.webp', center: [0.50, 0.502], span: [0.277, 0.089], rotation: -0.49 },
  sources: [
    { label: 'NASA/JPL-Caltech/UCLA · WISE infrared mosaic', href: 'https://science.nasa.gov/photojournal/our-neighbor-andromeda/' },
    {
      label: message('catalog.andromeda.andromeda.source.nasa-hubble-andromeda-galaxy'),
      href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-31/',
    },
  ],
};
