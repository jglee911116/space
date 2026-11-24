// 항성계(star-systems) · 은하 속 천체(featured-objects) ⊂ 은하(galaxies) ⊂ 국부은하군(local-group) · 은하군(galaxy-associations) ⊂ 초은하단(superclusters) ⊂ 관측 가능한 우주(observable-universe).
// 계층 간 id 참조는 components/explore/utils/validate-catalog.ts 가 빌드 시 검사한다.
import { featuredObjects } from './featured-objects';
import { milkyWay } from './galaxies/milky-way';
import { nearbyShowcase } from './galaxies/nearby-showcase';
import { galaxyAssociations } from './galaxy-associations';
import { localGroup } from './local-group';
import { distantObjects, observableUniverse } from './observable-universe';
import { systems } from './star-systems';
import { superclusters } from './superclusters';
import type { Galaxy } from './types';

/** 은하 경로(/galaxies/[id])가 열리는 전체 은하 — 국부은하군 소속은 local-group.ts, 은하군 소속은 galaxy-associations.ts 가 정한다. */
const galaxies: Galaxy[] = [...localGroup.galaxies, ...nearbyShowcase, ...galaxyAssociations.flatMap(({ members }) => members)];

export type * from './types';
export { bulletMembers } from './bullet-survey';
export { gaiaCounterparts } from './gaia-counterparts';
export { bulletWebbSources } from './bullet-webb-sources';
export { macsImages, macsMembers } from './macs-j0416-survey';
export { pandoraArcs, pandoraMembers } from './pandora-survey';
export { distantObjects, featuredObjects, galaxies, galaxyAssociations, localGroup, milkyWay, observableUniverse, superclusters, systems };
