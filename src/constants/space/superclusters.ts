import { message } from '@/i18n/messages';
import type { ClusterMarker, Supercluster } from './types';

export const virgoCluster: ClusterMarker = {
  name: message('catalog.superclusters.virgo-cluster.name'),
  clusterId: 'virgo',
  distanceMly: 54,
  rightAscension: 187.70592,
  declination: 12.39112,
  color: '#a4c6ff',
};
const normaCluster = {
  name: message('catalog.superclusters.norma-cluster.name'),
  distanceMly: 220,
  rightAscension: 243.35083,
  declination: -60.75806,
  color: '#dfb7fa',
};
const virgoSource = {
  label: message('catalog.superclusters.virgo-source.source.nasa-hubble-m87-and-the-virgo-cluster'),
  href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-87/',
};

// 안쪽 → 바깥 순서(처녀자리 ⊂ 라니아케아). 줌 전환이 이 순서를 따른다.
export const superclusters: readonly [Supercluster, Supercluster] = [
  {
    id: 'virgo',
    name: message('catalog.superclusters.virgo.name'),
    spanMly: 110,
    gridRadiusMly: 60,
    zoomOutMly: 205,
    zoomInMly: 150,
    summary: message('catalog.superclusters.virgo.summary'),
    markers: [virgoCluster],
    sources: [
      {
        label: message('catalog.superclusters.virgo.source.american-museum-of-natural-history-virgo-supercluster'),
        href: 'https://www.amnh.org/content/download/423415/6144487/file/du-data-profiles-2020.pdf',
      },
      virgoSource,
    ],
  },
  {
    id: 'laniakea',
    name: message('catalog.superclusters.laniakea.name'),
    spanMly: 520,
    gridRadiusMly: 275,
    zoomOutMly: 980,
    zoomInMly: 750,
    summary: message('catalog.superclusters.laniakea.summary'),
    markers: [virgoCluster, normaCluster],
    sources: [
      { label: message('catalog.superclusters.laniakea.source.tully-et-al-galaxy-flows-in-laniakea'), href: 'https://doi.org/10.1038/nature13674' },
      { label: message('catalog.superclusters.laniakea.source.esa-hubble-norma-cluster'), href: 'https://esahubble.org/images/heic1404a/' },
      virgoSource,
    ],
  },
];
