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
import { solarSystem } from './solar-system';
import { trappist1 } from './trappist-1';

export const systems = {
  solar: solarSystem,
  'alpha-centauri': alphaCentauri,
  'barnard-star': barnardStar,
  sirius: sirius,
  'epsilon-eridani': epsilonEridani,
  'ross-128': ross128,
  procyon: procyon,
  'trappist-1': trappist1,
  'gliese-12': gliese12,
  'lhs-1140': lhs1140,
  '51-pegasi': pegasi51,
  'kepler-16': kepler16,
  'm31v-j00443610-4129194': m31EclipsingBinary,
} satisfies Record<string, StarSystem>;
