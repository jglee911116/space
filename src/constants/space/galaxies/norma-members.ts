import { message } from '@/i18n/messages';
import type { Galaxy } from '../types';
import { normaSurveyPositions } from './norma-survey';

export const normaSurvey = { label: 'Woudt et al. · 2dF spectroscopy (CDS VizieR)', href: 'https://doi.org/10.26093/cds/vizier.73830445' };
export const normaStudy = { label: 'Woudt et al. · Norma Cluster dynamics', href: 'https://doi.org/10.1111/j.1365-2966.2007.12571.x' };
const distanceKpc = 67_450;

export const normaMembers: readonly Galaxy[] = [
  {
    id: 'eso-137-006',
    name: 'ESO 137-006',
    aliases: ['WKK 6269', 'WKK98 6269', 'PKS 1610-608'],
    summary: message('catalog.norma.eso-137-006'),
    distanceKpc,
    skyPosition: { rightAscension: 243.76597, declination: -60.907114 },
    modelRadiusKpc: 38,
    morphology: 'giant-elliptical',
    color: '#f2cea2',
    sources: [normaStudy, { label: 'MeerKAT · ESO 137-006', href: 'https://doi.org/10.1051/0004-6361/202037800' }],
  },
  {
    id: 'eso-137-001',
    name: 'ESO 137-001',
    aliases: ['WKK 6176', 'WKK98 6176'],
    summary: message('catalog.norma.eso-137-001'),
    distanceKpc,
    skyPosition: { rightAscension: 243.36377, declination: -60.76405 },
    modelRadiusKpc: 12,
    morphology: 'open-spiral',
    color: '#9bbdff',
    diskTilt: 0.74,
    ramPressureTail: { twin: true },
    sources: [{ label: 'ESA/Hubble · ESO 137-001', href: 'https://esahubble.org/images/heic1404a/' }, normaStudy],
  },
  {
    id: 'eso-137-002',
    name: 'ESO 137-002',
    aliases: ['WKK 6186', 'WKK98 6186'],
    summary: message('catalog.norma.eso-137-002'),
    distanceKpc,
    skyPosition: { rightAscension: 243.39855, declination: -60.86517 },
    modelRadiusKpc: 21,
    morphology: 'open-spiral',
    color: '#e6beaa',
    diskTilt: 0.18,
    ramPressureTail: {},
    sources: [
      { label: 'ESA/Hubble · ESO 137-002', href: 'https://esahubble.org/images/potw1302a/' },
      { label: 'CDS SIMBAD · ESO 137-002', href: 'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=ESO+137-002' },
    ],
  },
  {
    id: 'eso-137-007',
    name: 'ESO 137-007',
    aliases: ['WKK 6305', 'WKK98 6305'],
    summary: message('catalog.norma.eso-137-007'),
    distanceKpc,
    skyPosition: { rightAscension: 243.887175, declination: -60.665353 },
    modelRadiusKpc: 22,
    morphology: 'giant-elliptical',
    color: '#e2bee9',
    sources: [normaStudy, { label: 'MeerKAT · Radio galaxies in Abell 3627', href: 'https://academic.oup.com/view-large/477988124' }],
  },
  ...normaSurveyPositions.map(
    ([name, rightAscension, declination]): Galaxy => ({
      id: name.toLowerCase().replace(' ', '-'),
      name,
      summary: message('catalog.norma.survey-member'),
      distanceKpc,
      skyPosition: { rightAscension, declination },
      modelRadiusKpc: 12,
      color: '#d6c8e2',
      sources: [normaSurvey],
    }),
  ),
];
