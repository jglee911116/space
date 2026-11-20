// 항성계(star-systems) · 은하 속 천체(featured-objects) ⊂ 은하(galaxies) ⊂ 국부은하군(local-group) ⊂ 초은하단(superclusters) ⊂ 관측 가능한 우주(observable-universe).
import { featuredObjects } from './featured-objects';
import { galaxies, milkyWay } from './galaxies';
import { localGroup } from './local-group';
import { distantObjects, observableUniverse } from './observable-universe';
import { systems } from './star-systems';
import { superclusters } from './superclusters';

export type * from './types';
export { distantObjects, featuredObjects, galaxies, localGroup, milkyWay, observableUniverse, superclusters, systems };

// 계층 간 id 참조 오타를 모듈 로드(빌드) 시점에 잡는다.
const galaxyIds = new Set(galaxies.map(({ id }) => id));
const references: [string, string | undefined, Set<string>][] = [
  [`${milkyWay.id}.systemId`, milkyWay.systemId, new Set(Object.keys(systems))],
  ...Object.values(systems).map((system): [string, string | undefined, Set<string>] => [`${system.id}.galaxyId`, system.galaxyId, galaxyIds]),
  ...galaxies.map((galaxy): [string, string | undefined, Set<string>] => [`${galaxy.id}.parentGalaxyId`, galaxy.parentGalaxyId, galaxyIds]),
  ...galaxies.map((galaxy): [string, string | undefined, Set<string>] => [`${galaxy.id}.superclusterId`, galaxy.superclusterId, new Set(superclusters.map(({ id }) => id))]),
  ...featuredObjects.map((object): [string, string | undefined, Set<string>] => [`${object.id}.galaxyId`, object.galaxyId, galaxyIds]),
  ...featuredObjects.map((object): [string, string | undefined, Set<string>] => [`${object.id}.parentObjectId`, object.parentObjectId, new Set(featuredObjects.map(({ id }) => id))]),
  ...superclusters.flatMap(({ id, markers }) => markers.map((marker): [string, string | undefined, Set<string>] => [`${id}.markers.galaxyId`, marker.galaxyId, galaxyIds])),
];
for (const [field, id, known] of references) if (id !== undefined && !known.has(id)) throw new Error(`${field}: ${id} 가 없음`);
