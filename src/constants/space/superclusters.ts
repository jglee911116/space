import { message } from '@/i18n/messages';
import { virgoSource } from './galaxies/virgo-members';
import type { Supercluster } from './types';

const VIRGO_REGION_ID = 'virgo';
const LANIAKEA_REGION_ID = 'laniakea';
export const superclusters: readonly [Supercluster, Supercluster] = [
  {
    id: VIRGO_REGION_ID,
    name: message('catalog.superclusters.virgo.name'),
    spanMly: 110,
    gridRadiusMly: 60,
    zoomOutMly: 205,
    zoomInMly: 150,
    summary: message('catalog.superclusters.virgo.summary'),
    sources: [
      {
        label: message('catalog.superclusters.virgo.source.american-museum-of-natural-history-virgo-supercluster'),
        href: 'https://www.amnh.org/content/download/423415/6144487/file/du-data-profiles-2020.pdf',
      },
      virgoSource,
    ],
  },
  {
    id: LANIAKEA_REGION_ID,
    flowModel: 'laniakea',
    flowAnchors: { norma: 'norma', virgo: 'virgo', hydra: 'hydra-i', fornax: 'fornax' },
    name: message('catalog.superclusters.laniakea.name'),
    spanMly: 520,
    gridRadiusMly: 275,
    zoomOutMly: 980,
    zoomInMly: 750,
    summary: message('catalog.superclusters.laniakea.summary'),
    sources: [
      { label: message('catalog.superclusters.laniakea.source.tully-et-al-galaxy-flows-in-laniakea'), href: 'https://doi.org/10.1038/nature13674' },
      { label: 'NASA APOD · Laniakea flow visualization', href: 'https://apod.nasa.gov/apod/ap140910.html' },
      { label: 'Valade et al. · Cosmicflows-4 basins of attraction', href: 'https://www.nature.com/articles/s41550-024-02370-0' },
      { label: message('catalog.superclusters.laniakea.source.esa-hubble-norma-cluster'), href: 'https://esahubble.org/images/heic1404a/' },
      virgoSource,
    ],
  },
];
