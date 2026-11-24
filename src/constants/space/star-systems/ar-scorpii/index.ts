import { message } from '@/i18n/messages';
import type { OrbitElements, StarSystem } from '../../types';

const observation = { label: 'ESO · AR Scorpii', href: 'https://www.eso.org/public/news/eso1627/' };
const study = { label: 'MNRAS · Optical spectroscopy of AR Scorpii', href: 'https://academic.oup.com/mnras/article/520/2/2942/7010763' };
const sources = [observation, study];

function orbit(axisAu: number, meanLongitude: number): OrbitElements {
  return { axisAu, meanLongitude, eccentricity: 0, inclination: 60.4, ascendingNode: 0, perihelionLongitude: 0, periodDays: 0.14853528 };
}

export const arScorpii: StarSystem = {
  id: 'ar-scorpii',
  name: 'AR Scorpii',
  neighborhood: { distanceLightYears: 380, rightAscension: 245.447013, declination: -22.886218, source: observation },
  overviewDistance: 0.16,
  overviewLabel: message('navigation.viewBinary'),
  summary: message('catalog.ar-scorpii.ar-scorpii.summary'),
  sources,
  bodies: [
    {
      id: 'ar-scorpii-white-dwarf',
      name: message('catalog.ar-scorpii.ar-scorpii-white-dwarf.name'),
      kind: 'star',
      parent: null,
      displayRadius: 0.0045,
      tilt: 0,
      colors: ['#7697c7', '#e8f5ff', '#afcfff'],
      orbit: orbit(0.00134, 0),
      sources,
    },
    {
      id: 'ar-scorpii-red-dwarf',
      name: message('catalog.ar-scorpii.ar-scorpii-red-dwarf.name'),
      kind: 'star',
      parent: null,
      displayRadius: 0.014,
      tilt: 0,
      colors: ['#73263a', '#ff9a73', '#ff7958'],
      orbit: orbit(0.00401, 180),
      sources,
      stellarPulseSeconds: 118.2,
    },
  ],
};
