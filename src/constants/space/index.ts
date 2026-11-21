// 항성계(star-systems) · 은하 속 천체(featured-objects) ⊂ 은하(galaxies) ⊂ 국부은하군(local-group) ⊂ 초은하단(superclusters) ⊂ 관측 가능한 우주(observable-universe).
import { featuredObjects } from './featured-objects';
import { galaxies, milkyWay } from './galaxies';
import { localGroup } from './local-group';
import { distantObjects, observableUniverse } from './observable-universe';
import { systems } from './star-systems';
import { superclusters } from './superclusters';

export type * from './types';
export { distantObjects, featuredObjects, galaxies, localGroup, milkyWay, observableUniverse, superclusters, systems };
