import { message } from '@/i18n/messages';
import type { Galaxy } from '../types';
import { AU_PER_KPC, KM_PER_AU, KM_PER_LIGHT_YEAR } from '../units';

const kpcPerMly = (1e6 * KM_PER_LIGHT_YEAR) / (AU_PER_KPC * KM_PER_AU);

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
    distanceKpc: 31 * kpcPerMly,
    skyPosition: { rightAscension: 202.4696, declination: 47.1952 },
    modelRadiusKpc: 17,
    morphology: 'open-spiral',
    color: '#9cbaff',
    sources: [whirlpoolSource],
  },
  {
    id: 'ngc-5195',
    name: 'NGC 5195',
    aliases: ['M51b', 'M51 B'],
    summary: message('catalog.nearby-showcase.ngc5195.summary'),
    distanceKpc: 31 * kpcPerMly,
    skyPosition: { rightAscension: 202.4983, declination: 47.2661 },
    modelRadiusKpc: 6,
    morphology: 'irregular',
    color: '#f0cc89',
    sources: [whirlpoolSource],
  },
] satisfies readonly Galaxy[];

export const nearbyShowcase = [
  {
    id: 'ngc-253',
    name: message('catalog.nearby-showcase.ngc253.name'),
    title: 'NGC 253 · Caldwell 65',
    aliases: ['Silver Dollar Galaxy'],
    summary: message('catalog.nearby-showcase.ngc253.summary'),
    superclusterId: 'virgo',
    distanceKpc: 11 * kpcPerMly,
    skyPosition: { rightAscension: 11.888, declination: -25.2883 },
    modelRadiusKpc: 16,
    diskTilt: -0.3,
    morphology: 'open-spiral',
    color: '#e2bca3',
    sources: [{ label: 'ESO · NGC 253', href: 'https://www.eso.org/public/news/eso2510/' }],
  },
  {
    id: 'centaurus-a',
    name: message('catalog.nearby-showcase.centaurus-a.name'),
    title: 'Centaurus A · NGC 5128',
    aliases: ['Cen A', 'Caldwell 77'],
    summary: message('catalog.nearby-showcase.centaurus-a.summary'),
    superclusterId: 'virgo',
    distanceKpc: 11 * kpcPerMly,
    skyPosition: { rightAscension: 201.3651, declination: -43.0191 },
    modelRadiusKpc: 27,
    morphology: 'dust-lane-elliptical',
    color: '#e9bf90',
    sources: [{ label: 'ESA Webb · Centaurus A', href: 'https://esawebb.org/news/weic2615/' }],
  },
] satisfies readonly Galaxy[];
