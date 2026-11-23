import { useState } from 'react';
import { AdditiveBlending, BackSide, Color } from 'three';
import { bulletMembers, type ClusterLayer, type Galaxy } from '@/constants/space';
import { GalacticLabelLayer, GalacticMarker } from '../maps/galactic-marker';
import { GalaxyPreview } from './galaxy-preview';
import { BulletWebbField, bulletDisplaySpread, bulletSkyPosition, webbSources } from './bullet-webb-field';
import { useSurfaceMap } from '../shared/use-surface-map';

const members = bulletMembers.map(([ra, dec, redshift], index) => {
  const galaxy: Galaxy = {
    id: String(index), name: '1E 0657−56', summary: '', distanceKpc: 0, sources: [],
    modelRadiusKpc: 0.075 + ((index * 37) % 11) * 0.011,
    morphology: 'compact-elliptical',
    color: ['#e7c196', '#f1d6b8', '#d8deef'][index % 3],
  };
  // Redshift identifies members. It does not determine their depth inside the cluster.
  const position: [number, number, number] = [...bulletSkyPosition(ra, dec), ((index * 37) % 71) / 35 - 1];
  let nearest = -1;
  let separation = 0.058;
  webbSources.forEach(({ x, y }, source) => {
    const distance = Math.hypot(position[0] - x, position[1] - y);
    if (distance < separation) {
      nearest = source;
      separation = distance;
    }
  });
  const [x, y, z] = position;
  const [spreadX, spreadY, spreadZ] = bulletDisplaySpread;
  const displayPosition: [number, number, number] = [x * spreadX, y * spreadY, z * spreadZ];
  return { galaxy, displayPosition, depth: z, redshift, angle: index * 2.39996, nearest };
});

const depths = webbSources.map((_, index) => ((index * 233) % 521 / 521 - 0.5) * 2.75);
for (const { nearest, depth } of members) {
  if (nearest >= 0) depths[nearest] = depth;
}

const vertex = /* glsl */ `
  varying vec3 surface;
  varying vec3 eye;
  void main() {
    surface = position;
    eye = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragment = /* glsl */ `
  uniform vec3 tint;
  uniform float strength;
  uniform float structure;
  varying vec3 surface;
  varying vec3 eye;
  void main() {
    vec3 ray = normalize(surface - eye);
    vec3 closest = eye + ray * max(0.0, -dot(ray, eye));
    float radius = length(closest);
    float strands = sin(dot(closest, vec3(18.0, 21.0, 14.0)))
      * sin(dot(closest, vec3(26.0, -14.0, 19.0)));
    float glow = exp(-3.4 * radius * radius) * (1.0 - smoothstep(0.40, 0.99, radius));
    glow *= 1.0 + structure * strands * smoothstep(0.13, 0.60, radius);
    gl_FragColor = vec4(tint, glow * strength);
    #include <colorspace_fragment>
  }
`;

type Cloud = { position: [number, number, number]; scale: [number, number, number] };
// Illustrative density volumes. Gas peaks lag behind the galaxy/mass concentrations.
const gas: Cloud[] = [
  { position: [-0.9, 0.35, 0], scale: [2.45, 1.7, 1.15] },
  { position: [0.98, -0.25, 0], scale: [1.48, 0.68, 0.72] },
  { position: [0.30, -0.10, -0.12], scale: [1.62, 0.64, 0.58] },
];
const mass: Cloud[] = [
  { position: [-1.55, 0.4, 0], scale: [2.55, 1.63, 1.4] },
  { position: [1.95, -0.3, 0], scale: [1.57, 1.04, 0.96] },
  { position: [-2.45, 0.70, -0.27], scale: [1.62, 0.96, 0.82] },
];
const makeUniforms = (color: string, strength: number, structure: number) => ({
  tint: { value: new Color(color) }, strength: { value: strength }, structure: { value: structure },
});
const gasUniforms = makeUniforms('#e54976', 0.34, 0.20);
const massUniforms = makeUniforms('#518efe', 0.30, 0.08);
const stellarUniforms = makeUniforms('#e6b77f', 0.065, 0.14);

export function BulletCluster({ layer }: { layer: ClusterLayer }) {
  const [selected, setSelected] = useState<string>();
  const texture = useSurfaceMap('/textures/galaxies/bullet-cluster/webb-sources.webp');
  const clouds = layer === 'gas' ? gas : mass;
  const uniforms = layer === 'gas' ? gasUniforms : layer === 'mass' ? massUniforms : stellarUniforms;
  return (
    <GalacticLabelLayer>
      {texture && <BulletWebbField texture={texture} depths={depths} strength={layer === 'galaxies' ? 1 : 0.68} />}
      <group scale={bulletDisplaySpread}>
        {clouds.map((cloud, index) => (
          <mesh key={index} position={cloud.position} scale={cloud.scale} rotation-z={-0.28} raycast={() => {}}>
            <sphereGeometry args={[1, 32, 24]} />
            <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms}
              transparent depthWrite={false} side={BackSide} blending={AdditiveBlending} />
          </mesh>
        ))}
      </group>
      {members.map(({ galaxy, displayPosition, redshift, angle, nearest }) => (
        <group key={galaxy.id} position={displayPosition}>
          <group rotation-z={angle} scale={[0.72, 1, 0.82]}>
            <GalaxyPreview galaxy={galaxy}
              opacity={selected === galaxy.id ? 1 : texture && nearest >= 0 ? 0.14 : layer === 'galaxies' ? 0.94 : 0.55}
              onSelect={() => setSelected(galaxy.id)} />
          </group>
          {selected === galaxy.id && <GalacticMarker name={`z = ${redshift.toFixed(3)}`} labelOffset={0.6} priority={2} />}
        </group>
      ))}
    </GalacticLabelLayer>
  );
}
