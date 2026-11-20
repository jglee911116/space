import type { Galaxy } from '../types';
import { nearbyShowcase } from './nearby-showcase';
import { andromeda } from './andromeda';
import { messier110, messier32 } from './andromeda-satellites';
import { m87 } from './m87';
import { largeMagellanicCloud, smallMagellanicCloud } from './magellanic-clouds';
import { milkyWay } from './milky-way';
import { triangulum } from './triangulum';
import { galaxyAssociations } from '../galaxy-associations';

export { andromeda, largeMagellanicCloud, m87, messier110, messier32, milkyWay, smallMagellanicCloud, triangulum };

/** 은하 경로(/galaxies/[id])가 열리는 전체 은하. 국부은하군 소속 여부는 local-group.ts 가 정한다. */
export const galaxies: Galaxy[] = [
  milkyWay,
  largeMagellanicCloud,
  smallMagellanicCloud,
  andromeda,
  triangulum,
  messier32,
  messier110,
  ...nearbyShowcase,
  ...galaxyAssociations.flatMap(({ members }) => members),
];
