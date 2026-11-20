import { message } from '@/i18n/messages';
import { AU_PER_KPC, KM_PER_AU, KM_PER_LIGHT_YEAR } from '../units';
import type { Galaxy } from '../types';
import { m87 } from './m87';

const kpcPerMillionLightYears = (1e6 * KM_PER_LIGHT_YEAR) / (AU_PER_KPC * KM_PER_AU);

export const virgoGalaxies = [
  m87,
  {
    id: 'm84',
    name: 'M84',
    title: 'M84 · NGC 4374',
    summary: message('catalog.virgo-galaxies.m84.summary'),
    superclusterId: 'virgo',
    distanceKpc: 60 * kpcPerMillionLightYears,
    skyPosition: { rightAscension: 186.2656, declination: 12.887 },
    modelRadiusKpc: 23,
    morphology: 'giant-elliptical',
    color: '#d6b8a3',
    sources: [{ label: 'NASA Hubble · M84', href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-84/' }],
  },
  {
    id: 'm86',
    name: 'M86',
    title: 'M86 · NGC 4406',
    summary: message('catalog.virgo-galaxies.m86.summary'),
    superclusterId: 'virgo',
    distanceKpc: 52 * kpcPerMillionLightYears,
    skyPosition: { rightAscension: 186.55, declination: 12.9464 },
    modelRadiusKpc: 30,
    morphology: 'giant-elliptical',
    color: '#d2ccf5',
    sources: [{ label: 'NASA Hubble · M86', href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-86/' }],
  },
  {
    id: 'm49',
    name: 'M49',
    title: 'M49 · NGC 4472',
    summary: message('catalog.virgo-galaxies.m49.summary'),
    superclusterId: 'virgo',
    distanceKpc: 60 * kpcPerMillionLightYears,
    skyPosition: { rightAscension: 187.4417, declination: 7.9967 },
    modelRadiusKpc: 38,
    morphology: 'giant-elliptical',
    color: '#f6d291',
    sources: [{ label: 'NASA Hubble · M49', href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-49/' }],
  },
] satisfies readonly Galaxy[];
