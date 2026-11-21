import { useEffect, useMemo } from 'react';
import { SphereGeometry } from 'three';

type Silhouette = 'irregular' | 'lobed' | 'rounded-box';
type SurfaceProfile = readonly [
  seed: number, frost: number, contrast: number, craters: number, silhouette?: Silhouette,
];

const profiles: Readonly<Partial<Record<string, SurfaceProfile>>> = {
  haumea: [11, 0.70, 0.45, 0.06],
  makemake: [23, 0.53, 0.72, 0.10],
  eris: [37, 0.92, 0.20, 0.03],
  orcus: [41, 0.47, 0.62, 0.21],
  quaoar: [47, 0.37, 0.67, 0.17],
  gonggong: [59, 0.23, 0.76, 0.16],
  sedna: [61, 0.16, 0.58, 0.09],
  proteus: [73, 0.06, 0.59, 0.92, 'rounded-box'],
  styx: [83, 0.48, 0.76, 0.49, 'irregular'],
  nix: [89, 0.70, 0.61, 0.83, 'irregular'],
  kerberos: [97, 0.60, 0.63, 0.32, 'lobed'],
  hydra: [101, 0.73, 0.72, 0.72, 'irregular'],
  namaka: [103, 0.40, 0.52, 0.25],
  hiiaka: [107, 0.62, 0.50, 0.25],
  dysnomia: [113, 0.12, 0.49, 0.28],
};

export function outerSolarSurface(id: string) {
  return profiles[id];
}

export function PlanetGeometry({ radius, id }: { radius: number; id: string }) {
  const profile = profiles[id];
  const silhouette = profile?.[4];
  const geometry = useMemo(() => {
    if (!silhouette) return undefined;
    const sphere = new SphereGeometry(radius, 56, 40);
    const positions = sphere.attributes.position;
    const seed = profile[0];

    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index) / radius;
      const y = positions.getY(index) / radius;
      const z = positions.getZ(index) / radius;
      const relief = 0.037 * Math.sin(6 * x + 4 * y + seed) * Math.cos(7 * z - 3 * y)
        + 0.023 * Math.sin(14 * x - 9 * z + 8 * y + seed);
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
  }, [profile, radius, silhouette]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  return geometry ? <primitive object={geometry} attach="geometry" /> : <sphereGeometry args={[radius, 56, 40]} />;
}
