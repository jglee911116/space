import { nearbyShowcase } from './galaxies/nearby-showcase';
import { message } from '@/i18n/messages';
import { galaxyAssociations } from './galaxy-associations';
import { KPC_PER_MLY } from './units';
import type { ClusterMarker, GalaxyAssociation, Supercluster } from './types';

const groupMarkers = (groups: readonly GalaxyAssociation[]): ClusterMarker[] =>
  groups.flatMap(({ id, name, members: [anchor] }) => (anchor?.skyPosition ? [{ name, clusterId: id, distanceMly: anchor.distanceKpc / KPC_PER_MLY, color: anchor.color, ...anchor.skyPosition }] : []));
const nearbyMarkers: readonly ClusterMarker[] = nearbyShowcase.map(({ id, name, skyPosition, distanceKpc, color }) => ({
  name,
  galaxyId: id,
  distanceMly: distanceKpc / KPC_PER_MLY,
  color,
  ...skyPosition,
}));
const virgoSource = {
  label: message('catalog.superclusters.virgo-source.source.nasa-hubble-m87-and-the-virgo-cluster'),
  href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-87/',
};

export const VIRGO_REGION_ID = 'virgo';
export const LANIAKEA_REGION_ID = 'laniakea';
export const superclusters: readonly [Supercluster, Supercluster] = [
  {
    id: VIRGO_REGION_ID,
    name: message('catalog.superclusters.virgo.name'),
    spanMly: 110,
    gridRadiusMly: 60,
    zoomOutMly: 205,
    zoomInMly: 150,
    summary: message('catalog.superclusters.virgo.summary'),
    markers: [...groupMarkers(galaxyAssociations.filter(({ mapRegionId }) => mapRegionId === VIRGO_REGION_ID)), ...nearbyMarkers],
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
    name: message('catalog.superclusters.laniakea.name'),
    spanMly: 520,
    gridRadiusMly: 275,
    zoomOutMly: 980,
    zoomInMly: 750,
    summary: message('catalog.superclusters.laniakea.summary'),
    markers: groupMarkers(galaxyAssociations),
    sources: [
      { label: message('catalog.superclusters.laniakea.source.tully-et-al-galaxy-flows-in-laniakea'), href: 'https://doi.org/10.1038/nature13674' },
      { label: message('catalog.superclusters.laniakea.source.esa-hubble-norma-cluster'), href: 'https://esahubble.org/images/heic1404a/' },
      virgoSource,
    ],
  },
];
