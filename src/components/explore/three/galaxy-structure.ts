import { Color } from 'three';
import type { Galaxy } from '@/constants/space';

type Profile = {
  shape: 'spiral' | 'irregular' | 'elliptical';
  axis: number;
  thickness: number;
  core: number;
  asymmetry: number;
  arms: number;
  winding: number;
  bar: number;
  dust: number;
  ring: number;
  wind: number;
};

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

const variants: Readonly<Record<string, Partial<Profile>>> = {
  'large-magellanic-cloud': { axis: 0.80, bar: 0.37, asymmetry: 0.45 },
  'small-magellanic-cloud': { axis: 0.57, thickness: 0.25, asymmetry: 0.55 },
  triangulum: { arms: 3, winding: 1.69, core: 0.085, dust: 0.44, asymmetry: 0.23 },
  m32: { core: 0.11, axis: 0.82 },
  m110: { axis: 0.62, core: 0.34, dust: 0.12 },
  'ngc-253': { axis: 0.72, thickness: 0.047, core: 0.16, dust: 1.2, winding: 3.15 },
  'centaurus-a': { axis: 0.84, thickness: 0.69, dust: 2.25 },
  'ngc-5195': { axis: 0.74, core: 0.24, asymmetry: 0.63, dust: 0.66 },
  m81: { core: 0.29, winding: 3.45, asymmetry: 0.08 },
  m82: { shape: 'spiral', axis: 0.68, thickness: 0.039, arms: 0, bar: 0.30, dust: 1.5, wind: 1 },
  'ngc-3077': { axis: 0.86, core: 0.28, asymmetry: 0.46, dust: 0.64 },
  m87: { axis: 0.95, thickness: 0.81, core: 0.19 },
  m84: { axis: 0.91, thickness: 0.79, core: 0.16 },
  m86: { axis: 0.78, thickness: 0.62, core: 0.18 },
  m49: { axis: 0.85, thickness: 0.72, core: 0.25 },
  'ngc-1399': { axis: 0.92, thickness: 0.85, core: 0.24 },
  'ngc-1365': { bar: 0.52, winding: 1.62, asymmetry: 0.20, dust: 0.95 },
  m95: { bar: 0.34, winding: 2.66, ring: 0.36, dust: 0.60 },
  m96: { bar: 0.21, winding: 3.12, asymmetry: 0.58, dust: 1.04, ring: 0.47 },
  m105: { axis: 0.94, thickness: 0.85, core: 0.14 },
  'ngc-3311': { axis: 0.98, thickness: 0.9, core: 0.32 },
  'ngc-3309': { axis: 0.78, thickness: 0.69, core: 0.16 },
};

export function galaxyStructure(galaxy: Galaxy) {
  const base = galaxy.morphology ? morphology[galaxy.morphology] ?? disk : disk;
  const seed = [...galaxy.id].reduce((value, character) => Math.imul(value, 31) + character.charCodeAt(0) | 0, 119);
  return { ...base, ...variants[galaxy.id], seed, phase: (seed >>> 0) % 4096 / 4096 * Math.PI * 2 };
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
  let seed = profile.seed;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  }

  for (let offset = 0; offset < positions.length; offset += 3) {
    const elliptical = profile.shape === 'elliptical';
    const core = random() < (elliptical ? 0.48 : 0.17);
    const arm = !core && profile.arms > 0 && random() < 0.64;
    const r = core ? profile.core * 1.55 * random() ** 1.3 : random() ** (elliptical ? 0.83 : 0.62);
    let angle = random() * Math.PI * 2;
    if (arm) {
      const branch = Math.floor(random() * profile.arms) * Math.PI * 2 / profile.arms;
      angle = branch + profile.winding * Math.log(Math.max(r, 0.11) / Math.max(profile.bar, 0.11)) + (random() - 0.5) * 0.58;
      if (!profile.bar) angle += profile.phase;
    }
    const uneven = 1 + profile.asymmetry * (0.36 * Math.cos(angle - profile.phase) + 0.18 * Math.sin(3 * angle + profile.phase));
    const latitude = 2 * random() - 1;
    const plane = elliptical ? Math.sqrt(1 - latitude * latitude) : 1;
    const size = galaxy.modelRadiusKpc;
    positions[offset] = r * plane * Math.cos(angle) * uneven * size;
    positions[offset + 1] = latitude * (elliptical ? profile.thickness * r : core ? 0.55 * profile.core : profile.thickness * (1 - 0.55 * r)) * size;
    positions[offset + 2] = r * plane * Math.sin(angle) * profile.axis * uneven * size;
    const knot = !elliptical && !core && random() > 0.96;
    tint.copy(core || elliptical ? diskColor : arm ? hotColor : diskColor)
      .lerp(coreColor, core ? 0.61 : elliptical ? 0.18 : 0.06);
    if (knot) tint.lerp(nebulaColor, 0.75);
    tint.multiplyScalar(((knot ? 0.67 : 0.23) + random() * (knot ? 0.56 : 0.58)) * (1 - r ** 4));
    tint.toArray(colors, offset);
  }
  return { positions, colors };
}
