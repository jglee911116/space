import { useEffect, useMemo } from 'react';
import { SphereGeometry } from 'three';
import type { Body } from '@/constants/space';

export function PlanetGeometry({ radius, body }: { radius: number; body: Body }) {
  const { silhouette } = body;
  const seed = body.rockySurface?.[0] ?? 0;
  const geometry = useMemo(() => {
    if (!silhouette) return undefined;
    const sphere = new SphereGeometry(radius, 56, 40);
    const positions = sphere.attributes.position;

    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index) / radius;
      const y = positions.getY(index) / radius;
      const z = positions.getZ(index) / radius;
      const relief = 0.037 * Math.sin(6 * x + 4 * y + seed) * Math.cos(7 * z - 3 * y) + 0.023 * Math.sin(14 * x - 9 * z + 8 * y + seed);
      let scale = 1 + relief;
      if (silhouette === 'rounded-box') {
        const cube = (x ** 6 + y ** 6 + z ** 6) ** (-1 / 6);
        scale = 0.94 + 0.58 * (cube - 1) + relief * 0.63;
      }
      if (silhouette === 'lobed') {
        scale -= 0.27 * Math.exp(-((x + 0.12) ** 2) / 0.085);
        scale *= 1 - 0.12 * x;
      }
      positions.setXYZ(index, x * radius * scale, y * radius * scale, z * radius * scale);
    }
    // Adjacent UV seam vertices share a position but are separate for texture coordinates.
    sphere.computeVertexNormals();
    const normals = sphere.attributes.normal;
    for (let row = 1; row < 40; row++) {
      const first = row * 57;
      const last = first + 56;
      const x = normals.getX(first) + normals.getX(last);
      const y = normals.getY(first) + normals.getY(last);
      const z = normals.getZ(first) + normals.getZ(last);
      const length = Math.hypot(x, y, z);
      normals.setXYZ(first, x / length, y / length, z / length);
      normals.setXYZ(last, x / length, y / length, z / length);
    }
    sphere.computeBoundingSphere();
    return sphere;
  }, [seed, radius, silhouette]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  return geometry ? <primitive object={geometry} attach="geometry" /> : <sphereGeometry args={[radius, 56, 40]} />;
}
