import { whirlpoolMembers, whirlpoolSource } from './galaxies/nearby-showcase';
import { message } from '@/i18n/messages';
import { fornaxMembers, hydraMembers, hydraSurvey, leoMembers, m81Members } from './galaxies/nearby-groups';
import { virgoGalaxies } from './galaxies/virgo-members';
import { normaMembers, normaStudy, normaSurvey } from './galaxies/norma-members';
import { ngc3109Members, ngc3109Study } from './galaxies/local-dwarfs';
import type { GalaxyAssociation } from './types';

export const galaxyAssociations: readonly GalaxyAssociation[] = [
  {
    id: 'norma',
    mapRegionId: 'laniakea',
    name: message('catalog.superclusters.norma-cluster.name'),
    aliases: ['Norma Cluster', 'Abell 3627', 'ACO 3627'],
    summary: message('catalog.norma.summary'),
    members: normaMembers,
    gridRadiusMly: 6.8,
    volumeMembers: true,
    illustrativeDepthMly: 3.2,
    sources: [normaStudy, normaSurvey],
  },
  {
    id: 'ngc-3109-association',
    mapRegionId: 'virgo',
    name: message('catalog.dwarf.ngc-3109-association.name'),
    aliases: ['NGC 3109 Association', 'NGC 3109 Group'],
    summary: message('catalog.dwarf.ngc-3109-association.summary'),
    members: ngc3109Members,
    gridRadiusMly: 2.4,
    volumeMembers: true,
    sources: [ngc3109Study],
  },
  { id: 'virgo', mapRegionId: 'virgo', name: message('catalog.superclusters.virgo-cluster.name'), members: virgoGalaxies, gridRadiusMly: 6, sources: [] },
  {
    id: 'm81-group',
    mapRegionId: 'virgo',
    name: message('catalog.nearby-groups.m81-group.name'),
    aliases: ['M81/M82 Group', 'M81 Group'],
    summary: message('catalog.nearby-groups.m81-group.summary'),
    members: m81Members,
    gridRadiusMly: 0.65,
    sources: [{ label: 'NASA Hubble · M81/M82 Group', href: 'https://science.nasa.gov/asset/hubble/location-of-the-m81m82-galaxy-group-on-the-sky/' }],
  },
  {
    id: 'fornax',
    mapRegionId: 'virgo',
    name: message('catalog.nearby-groups.fornax.name'),
    summary: message('catalog.nearby-groups.fornax.summary'),
    members: fornaxMembers,
    gridRadiusMly: 3.5,
    sources: [{ label: 'ESO · Fornax Cluster', href: 'https://www.eso.org/public/images/eso0949c/' }],
  },
  {
    id: 'leo-i',
    mapRegionId: 'virgo',
    name: message('catalog.nearby-groups.leo-i.name'),
    aliases: ['M96 Group', '사자자리 I 은하군'],
    summary: message('catalog.nearby-groups.leo-i.summary'),
    members: leoMembers,
    gridRadiusMly: 2.2,
    sources: [{ label: 'NASA Hubble · Leo I Group', href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-96/' }],
  },
  {
    id: 'hydra-i',
    mapRegionId: 'laniakea',
    name: message('catalog.nearby-groups.hydra-i.name'),
    aliases: ['Abell 1060', 'ACO 1060'],
    summary: message('catalog.nearby-groups.hydra-i.summary'),
    members: hydraMembers,
    gridRadiusMly: 0.13,
    sources: [hydraSurvey],
  },
  {
    id: 'm51-pair',
    mapRegionId: 'virgo',
    name: message('catalog.nearby-showcase.m51-pair.name'),
    aliases: ['Whirlpool pair', 'M51 pair'],
    summary: message('catalog.nearby-showcase.m51-pair.summary'),
    members: whirlpoolMembers,
    gridRadiusMly: 0.085,
    sources: [whirlpoolSource],
  },
];
