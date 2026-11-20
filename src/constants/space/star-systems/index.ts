import type { StarSystem } from '../types';
import { pegasi51 } from './51-pegasi';
import { alphaCentauri } from './alpha-centauri';
import { barnardStar } from './barnard-star';
import { epsilonEridani } from './epsilon-eridani';
import { kepler16 } from './kepler-16';
import { m31EclipsingBinary } from './m31-eclipsing-binary';
import { procyon } from './procyon';
import { ross128 } from './ross-128';
import { sirius } from './sirius';
import { solarSystem } from './solar-system';
import { trappist1 } from './trappist-1';

// 데이터 작성 실수를 모듈 로드(빌드) 시점에 잡는다 — 렌더링과 궤도 계산이 이 순서·관계를 전제한다.
function validate(system: StarSystem) {
  const seen = new Set<string>();
  for (const body of system.bodies) {
    if (seen.has(body.id)) throw new Error(`${system.id}: 중복 id ${body.id}`);
    if (body.parent === null ? body.kind !== 'star' && (body.kind !== 'planet' || !body.orbit) : !seen.has(body.parent)) throw new Error(`${system.id}: ${body.id} 의 parent 가 없거나 뒤에 있음`);
    if (body.parent !== null && !body.orbit) throw new Error(`${system.id}: ${body.id} 에 orbit 이 없음`);
    seen.add(body.id);
  }
  return system;
}

// 첫 항목이 기본 계(URL 에 system 파라미터가 없을 때).
export const systems = {
  solar: validate(solarSystem),
  'alpha-centauri': validate(alphaCentauri),
  'barnard-star': validate(barnardStar),
  sirius: validate(sirius),
  'epsilon-eridani': validate(epsilonEridani),
  'ross-128': validate(ross128),
  procyon: validate(procyon),
  'trappist-1': validate(trappist1),
  '51-pegasi': validate(pegasi51),
  'kepler-16': validate(kepler16),
  'm31v-j00443610-4129194': validate(m31EclipsingBinary),
} satisfies Record<string, StarSystem>;
