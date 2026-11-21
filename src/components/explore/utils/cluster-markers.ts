import { galaxies, galaxyAssociations, superclusters, type Supercluster } from '@/constants/space';
import type { CatalogText } from '@/i18n/messages';
import { KPC_PER_MLY } from '@/constants/space/units';

export type ClusterMarker = {
  clusterId?: string;
  galaxyId?: string;
  name: CatalogText;
  distanceMly: number;
  rightAscension: number;
  declination: number;
  color: string;
};

const regionIndex = (id: string) => superclusters.findIndex((region) => region.id === id);

/** 초은하단 지도 표시: 이 영역과 안쪽 영역의 은하군(대표 은하 위치) + 이 영역에 직접 속한 은하. */
export function regionMarkers(region: Supercluster): ClusterMarker[] {
  const index = regionIndex(region.id);
  const groups = galaxyAssociations.flatMap(({ id, name, mapRegionId, members: [anchor] }) =>
    regionIndex(mapRegionId) <= index && anchor?.skyPosition ? [{ name, clusterId: id, distanceMly: anchor.distanceKpc / KPC_PER_MLY, color: anchor.color, ...anchor.skyPosition }] : [],
  );
  const loose = galaxies.flatMap(({ id, name, superclusterId, skyPosition, distanceKpc, color }) =>
    superclusterId === region.id && skyPosition ? [{ name, galaxyId: id, distanceMly: distanceKpc / KPC_PER_MLY, color, ...skyPosition }] : [],
  );
  return [...groups, ...loose];
}
