import { Color, MathUtils, SRGBColorSpace, type Texture } from 'three';
import type { Galaxy } from '@/constants/space';
import { seededRandom } from '../../utils/random';

const SAMPLE_SIZE = 220;

export function galaxyObservationPoints(texture: Texture, observation: NonNullable<Galaxy['diskObservation']>, radius: number, count: number) {
  const image = texture.image;
  if (!(image instanceof HTMLImageElement)) return null;
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const { center, span, rotation = 0 } = observation;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  // Invert the UV rotation used by the volume shader before applying the disk scale.
  const diskX = (u: number, v: number) => (cosine * (u - center[0]) + sine * (v - center[1])) / span[0];
  const diskZ = (u: number, v: number) => (sine * (u - center[0]) - cosine * (v - center[1])) / span[1];
  const distribution = new Float64Array(SAMPLE_SIZE ** 2);
  const tint = new Color();
  let total = 0;
  for (let index = 0; index < distribution.length; index++) {
    const u = (index % SAMPLE_SIZE + 0.5) / SAMPLE_SIZE;
    const v = 1 - (Math.floor(index / SAMPLE_SIZE) + 0.5) / SAMPLE_SIZE;
    const radial = Math.hypot(diskX(u, v), diskZ(u, v));
    const edge = Math.min(u, v, 1 - u, 1 - v);
    const offset = index * 4;
    tint.setRGB(data[offset] / 255, data[offset + 1] / 255, data[offset + 2] / 255, SRGBColorSpace);
    const light = Math.max(tint.r, tint.g, tint.b);
    // These are the same radial and frame masks used by the textured disk.
    const coverage = (1 - MathUtils.smoothstep(radial, 0.72, 0.98)) * MathUtils.smoothstep(edge, 0, 0.095);
    total += coverage * MathUtils.smoothstep(light, 0.008, 0.22) * light ** 0.9;
    distribution[index] = total;
  }
  if (total === 0) return null;

  const random = seededRandom(2195);

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const sample = random() * total;
    let low = 0;
    let high = distribution.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (distribution[middle] <= sample) low = middle + 1;
      else high = middle;
    }

    // Canvas rows run downward while the GPU texture's v axis runs upward.
    const u = (low % SAMPLE_SIZE + random()) / SAMPLE_SIZE;
    const v = 1 - (Math.floor(low / SAMPLE_SIZE) + random()) / SAMPLE_SIZE;
    const x = diskX(u, v);
    const z = diskZ(u, v);
    const radial = Math.hypot(x, z);
    const thickness = 0.016 + 0.074 * Math.exp(-radial * radial * 35);
    const y = (random() + random() - 1) * thickness;
    positions.set([x * radius, y * radius, z * radius], i * 3);
    const offset = low * 4;
    const frameFade = MathUtils.smoothstep(Math.min(u, v, 1 - u, 1 - v), 0, 0.13);
    tint
      .setRGB(data[offset] / 255, data[offset + 1] / 255, data[offset + 2] / 255, SRGBColorSpace)
      .multiplyScalar((0.66 + 0.34 * random()) * frameFade)
      .toArray(colors, i * 3);
  }
  return { positions, colors };
}
