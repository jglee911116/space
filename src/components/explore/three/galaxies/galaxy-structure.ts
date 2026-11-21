import { Color } from 'three';
import type { Galaxy, GalaxyStructure } from '@/constants/space';
import { seededRandom } from '../../utils/random';

type Profile = Omit<GalaxyStructure, 'phase'>;

const disk: Profile = { shape: 'spiral', axis: 0.92, thickness: 0.052, core: 0.20, asymmetry: 0.12, arms: 2, winding: 2.5, bar: 0, dust: 0.72, ring: 0, wind: 0 };
const irregular: Profile = { ...disk, shape: 'irregular', axis: 0.68, thickness: 0.16, core: 0.15, asymmetry: 0.36, arms: 0, dust: 0.30 };
const elliptical: Profile = { ...disk, shape: 'elliptical', axis: 0.86, thickness: 0.74, core: 0.20, asymmetry: 0.04, arms: 0, dust: 0 };

const morphology: Partial<Record<NonNullable<Galaxy['morphology']>, Profile>> = {
  'barred-spiral': { ...disk, bar: 0.36 },
  'open-spiral': disk,
  irregular,
  'barred-irregular': { ...irregular, bar: 0.33 },
  'giant-elliptical': elliptical,
  'compact-elliptical': { ...elliptical, axis: 0.78, thickness: 0.62, core: 0.15 },
  'dwarf-elliptical': { ...elliptical, axis: 0.71, thickness: 0.49, core: 0.32 },
  'dust-lane-elliptical': { ...elliptical, dust: 1 },
};

export function galaxyStructure(galaxy: Galaxy) {
  const base = galaxy.morphology ? morphology[galaxy.morphology] ?? disk : disk;
  const seed = [...galaxy.id].reduce((value, character) => Math.imul(value, 31) + character.charCodeAt(0) | 0, 119);
  return { ...base, seed, phase: (seed >>> 0) % 4096 / 4096 * Math.PI * 2, ...galaxy.structure };
}

export function galaxyParticles(galaxy: Galaxy, count: number) {
  const profile = galaxyStructure(galaxy);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const diskColor = new Color(galaxy.color);
  const coreColor = new Color('#ffe3bc');
  const hotColor = new Color('#b8ceff');
  const nebulaColor = new Color('#df7394');
  const tint = new Color();
  const random = seededRandom(profile.seed);

  for (let offset = 0; offset < positions.length; offset += 3) {
    const elliptical = profile.shape === 'elliptical';
    const diffuse = profile.shape === 'irregular';
    const core = random() < (elliptical ? 0.48 : 0.17);
    const arm = !core && profile.arms > 0 && random() < 0.64;
    const r = core ? profile.core * 1.55 * random() ** 1.3 : random() ** (elliptical ? 0.83 : diffuse ? 0.74 : 0.62);
    let angle = random() * Math.PI * 2;
    if (arm) {
      const branch = Math.floor(random() * profile.arms) * Math.PI * 2 / profile.arms;
      angle = branch + profile.winding * Math.log(Math.max(r, 0.11) / Math.max(profile.bar, 0.11)) + (random() - 0.5) * 0.58;
      if (!profile.bar) angle += profile.phase;
    }
    const uneven = 1 + profile.asymmetry * (0.36 * Math.cos(angle - profile.phase) + 0.18 * Math.sin(3 * angle + profile.phase));
    const latitude = 2 * random() - 1;
    const plane = elliptical || diffuse ? Math.sqrt(1 - latitude * latitude) : 1;
    const size = galaxy.modelRadiusKpc;
    positions[offset] = r * plane * Math.cos(angle) * uneven * size;
    positions[offset + 1] = latitude * (elliptical || diffuse ? profile.thickness * r : core ? 0.55 * profile.core : profile.thickness * (1 - 0.55 * r)) * size;
    positions[offset + 2] = r * plane * Math.sin(angle) * profile.axis * uneven * size;
    const knot = !elliptical && !core && random() > 0.96;
    tint.copy(core || elliptical ? diskColor : arm ? hotColor : diskColor)
      .lerp(coreColor, core ? 0.61 : elliptical ? 0.18 : 0.06);
    if (knot) tint.lerp(nebulaColor, 0.75);
    const edgeFade = diffuse ? (1 - r * r) ** 2 : 1 - r ** 4;
    tint.multiplyScalar(((knot ? 0.67 : 0.23) + random() * (knot ? 0.56 : 0.58)) * edgeFade);
    tint.toArray(colors, offset);
  }
  return { positions, colors };
}
