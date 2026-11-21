import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

function createSurface(seed: number) {
  const canvas = document.createElement('canvas');
  const width = 1024;
  const height = 512;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  }

  const pixels = context.createImageData(width, height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const shade = 118 + random() * 36;
    pixels.data[index] = shade + 8;
    pixels.data[index + 1] = shade + 3;
    pixels.data[index + 2] = shade;
    pixels.data[index + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);

  for (let index = 0; index < 440; index++) {
    const x = random() * width;
    const y = random() * height;
    const radius = 1.5 + 35 * random() ** 5;
    const latitude = (y / height - 0.5) * Math.PI;
    const horizontalStretch = 1 / Math.max(0.3, Math.cos(latitude));

    for (const offset of [-width, 0, width]) {
      context.save();
      context.translate(x + offset, y);
      context.scale(horizontalStretch, 1);
      const crater = context.createRadialGradient(0, 0, 0, 0, 0, radius);
      crater.addColorStop(0, 'rgba(83, 75, 72, 0.4)');
      crater.addColorStop(0.72, 'rgba(57, 49, 48, 0.52)');
      crater.addColorStop(0.89, 'rgba(215, 200, 186, 0.42)');
      crater.addColorStop(1, 'rgba(215, 200, 186, 0)');
      context.fillStyle = crater;
      context.fillRect(-radius, -radius, radius * 2, radius * 2);
      context.restore();
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function CraterSurface({ seed, fallback }: { seed: number; fallback: string }) {
  const texture = useMemo(() => createSurface(seed), [seed]);
  useEffect(() => () => texture?.dispose(), [texture]);

  return <meshStandardMaterial color={texture ? '#ffffff' : fallback} map={texture} roughness={1} />;
}
