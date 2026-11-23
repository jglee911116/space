import { message } from '@/i18n/messages';
import type { FeaturedObject } from '../types';

export const rAquarii: FeaturedObject = {
  id: 'r-aquarii',
  name: message('catalog.next.rAqr.name'),
  designation: 'R Aqr · HD 222800',
  aliases: ['R Aquarii', 'R Aqr', '물병자리R'],
  description: message('catalog.next.rAqr.summary'),
  kind: 'wind-binary',
  observationStatus: 'observed',
  distanceLightYears: 700,
  rightAscension: 355.958,
  declination: -15.284,
  extentLightYears: 0.6,
  color: '#9ccccc',
  observationImage: { file: '/textures/nebulae/stellar-outflows/r-aquarii/hubble.webp', shape: 'symbiotic-outflow', telescope: 'hubble' },
  sources: [
    { label: 'NASA, ESA, M. Stute, M. Karovska, D. de Martin & M. Zamani · Hubble', href: 'https://esahubble.org/images/heic2413a/' },
    { label: 'ESA/Hubble · 2014–2023 time-lapse', href: 'https://esahubble.org/news/heic2413/' },
  ],
};

export const hh46: FeaturedObject = {
  id: 'hh-46-47',
  name: message('catalog.next.hh46.name'),
  designation: 'Herbig–Haro 46/47',
  aliases: ['HH 46', 'HH 47', 'HH 46/47', 'Herbig-Haro 46/47'],
  description: message('catalog.next.hh46.summary'),
  kind: 'star-forming-region',
  observationStatus: 'observed',
  distanceLightYears: 1470,
  rightAscension: 126.432125,
  declination: -51.0106,
  extentLightYears: 1.8,
  color: '#e7ad84',
  observationImage: { file: '/textures/nebulae/stellar-outflows/hh-46-47/webb.webp', shape: 'protostar-bows' },
  sources: [{ label: 'NASA, ESA, CSA & STScI · Webb NIRCam', href: 'https://esawebb.org/images/weic2319a/' }],
};
