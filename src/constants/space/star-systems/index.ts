import type { StarSystem } from '../types';
import { pegasi51 } from './51-pegasi';
import { alphaCentauri } from './alpha-centauri';
import { barnardStar } from './barnard-star';
import { epsilonEridani } from './epsilon-eridani';
import { kepler16 } from './kepler-16';
import { m31EclipsingBinary } from './m31-eclipsing-binary';
import { gliese12, lhs1140 } from './nearby-exoplanets';
import { procyon } from './procyon';
import { ross128 } from './ross-128';
import { sirius } from './sirius';
import { arScorpii } from './ar-scorpii';
import { solarSystem } from './solar-system';
import { trappist1 } from './trappist-1';

// 첫 항목이 기본 항성계
export const systems: readonly StarSystem[] = [solarSystem, alphaCentauri, barnardStar, sirius, epsilonEridani, ross128, procyon, trappist1, gliese12, lhs1140, pegasi51, kepler16, arScorpii, m31EclipsingBinary];
