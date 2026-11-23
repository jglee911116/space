import { useState } from 'react';
import { AdditiveBlending, BackSide, DoubleSide, MathUtils } from 'three';
import type { Galaxy } from '@/constants/space';
import { macsImages, macsMembers, pandoraArcs, pandoraMembers } from '@/constants/space';
import { GalacticLabelLayer, GalacticMarker } from '../maps/galactic-marker';
import { GalaxyPreview } from './galaxy-preview';

const centerRa = 3.5876;
const centerDec = -30.3975;
const skyScale = 245;
const rightAscensionProjection = Math.cos(MathUtils.degToRad(centerDec));
const positionFor = (ra: number, dec: number, depth: number): [number, number, number] => [
  (centerRa - ra) * skyScale * rightAscensionProjection,
  (dec - centerDec) * skyScale,
  depth,
];

const members = pandoraMembers.map(([id, ra, dec, major, minor, theta]) => {
  // Radial velocities include internal motion. Depth here separates overlapping elements for viewing.
  const [x, y] = positionFor(ra, dec, 0);
  const edge = MathUtils.smoothstep(Math.hypot(x / 4.7, y / 4.2), 0.55, 1.45);
  const depth = (((id * 317) % 997) / 997 - 0.5) * MathUtils.lerp(3.7, 1.35, edge);
  const galaxy: Galaxy = {
    id: String(id), name: `MUSE ${id}`, summary: '', distanceKpc: 0, sources: [],
    modelRadiusKpc: MathUtils.clamp(major * 1680, 0.09, 0.32),
    morphology: 'compact-elliptical',
    color: ['#efc698', '#e2c7ac', '#dad6ec', '#f2d3b5'][id % 4],
  };
  return {
    galaxy, position: positionFor(ra, dec, depth),
    opacity: MathUtils.lerp(1, 0.24, edge),
    rotation: MathUtils.degToRad(theta) + Math.PI / 2,
    axis: major > 0 ? MathUtils.clamp(minor / major, 0.46, 1) : 0.78,
  };
});

const arcs = pandoraArcs.map(([id, ra, dec, major, minor, theta]) => ({
  id, position: positionFor(ra, dec, -1.05),
  rotation: MathUtils.degToRad(theta),
  length: MathUtils.clamp(major * 4300, 0.23, 0.72),
  width: MathUtils.clamp(minor * 3100, 0.095, 0.18),
}));

const macsPosition = (ra: number, dec: number, depth: number): [number, number, number] => [
  (64.038 - ra) * 180, (dec + 24.067) * 197, depth,
];
const macsGalaxies = macsMembers.map(([id, ra, dec, magnitude]) => {
  const brightness = 1 - MathUtils.smoothstep(magnitude, 17, 24);
  const galaxy: Galaxy = {
    id: String(id), name: `MACS0416 ${id}`, summary: '', distanceKpc: 0, sources: [],
    modelRadiusKpc: MathUtils.lerp(0.12, 0.46, brightness ** 1.35),
    morphology: 'compact-elliptical', color: ['#f1cb9f', '#ecd6b9', '#d1c7dc'][id % 3],
  };
  return {
    galaxy, position: macsPosition(ra, dec, ((id * 317) % 997 / 997 - 0.5) * 2.8),
    opacity: MathUtils.lerp(0.61, 1, brightness), rotation: id * 2.39996,
    axis: MathUtils.lerp(0.55, 0.95, id % 11 / 10),
  };
});
// Draw a sample of the cataloged image centers; the arc sizes and curvature are illustrative.
const macsArcs = macsImages.filter((_, index) => index % 3 !== 2).map(([id, ra, dec, redshift], index) => {
  const position = macsPosition(ra, dec, -1.45 - (index % 7) * 0.12);
  const center = position[1] < -0.9 ? macsPosition(64.031967, -24.077426, 0) : macsPosition(64.038101, -24.067485, 0);
  return {
    id, position, rotation: Math.atan2(position[1] - center[1], position[0] - center[0]) + Math.PI / 2,
    length: 0.16 + (index % 9) * 0.023, width: 0.056 + redshift * 0.003,
  };
});

const arcVertex = /* glsl */ `
  varying vec2 point;
  void main() {
    point = 2.0 * uv - 1.0;
    vec3 surface = position;
    surface.z += 0.12 * (point.x * point.x - 0.25);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(surface, 1.0);
  }
`;

const arcFragment = /* glsl */ `
  varying vec2 point;
  void main() {
    float center = 0.50 * (point.x * point.x - 0.36);
    float ridge = (point.y - center) / 0.18;
    float taper = (1.0 - smoothstep(0.27, 1.0, abs(point.x))) * (1.0 - smoothstep(0.60, 1.0, abs(point.y)));
    float knots = 0.64 + 0.36 * pow(0.5 + 0.5 * cos(point.x * 21.0), 3.0);
    float brightness = (0.76 * exp(-ridge * ridge) + 0.22 * exp(-0.21 * ridge * ridge)) * taper * knots;
    gl_FragColor = vec4(mix(vec3(0.25, 0.49, 0.79), vec3(0.92, 0.77, 0.63), smoothstep(-0.4, 0.8, point.x)), brightness * 0.81);
    #include <colorspace_fragment>
  }
`;

const haloVertex = /* glsl */ `
  varying vec3 surface;
  varying vec3 eye;
  void main() {
    surface = position;
    eye = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const haloFragment = /* glsl */ `
  varying vec3 surface;
  varying vec3 eye;
  void main() {
    vec3 ray = normalize(surface - eye);
    vec3 closest = eye + ray * max(0.0, -dot(ray, eye));
    float radius = length(closest);
    float glow = exp(-5.6 * radius * radius) * (1.0 - smoothstep(0.45, 0.98, radius));
    gl_FragColor = vec4(0.26, 0.19, 0.17, glow * 0.11);
    #include <colorspace_fragment>
  }
`;

export function SurveyCluster({ profile }: { profile: 'pandora' | 'macs-j0416' }) {
  const [selected, setSelected] = useState<string>();
  const macs = profile === 'macs-j0416';
  const galaxies = macs ? macsGalaxies : members;
  const lensedImages = macs ? macsArcs : arcs;
  return (
    <GalacticLabelLayer>
      <mesh position={[0.05, -0.1, -0.15]} scale={[6.1, 5.5, 2.8]} raycast={() => {}}>
        <sphereGeometry args={[1, 32, 24]} />
        <shaderMaterial vertexShader={haloVertex} fragmentShader={haloFragment} side={BackSide} transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      {galaxies.map(({ galaxy, position, rotation, axis, opacity }) => (
        <group key={galaxy.id} position={position}>
          <group rotation-z={rotation} scale={[axis, 1, 1]}>
            <GalaxyPreview galaxy={galaxy} opacity={selected === galaxy.id ? 1 : opacity} onSelect={() => setSelected(galaxy.id)} />
          </group>
          {selected === galaxy.id && <GalacticMarker name={galaxy.name} labelOffset={0.9} priority={2} />}
        </group>
      ))}
      {lensedImages.map(({ id, position, rotation, length, width }) => (
        <mesh key={id} position={position} rotation-z={rotation} scale={[length, width, 1]} raycast={() => {}}>
          <planeGeometry args={[1, 1, 12, 1]} />
          <shaderMaterial vertexShader={arcVertex} fragmentShader={arcFragment} side={DoubleSide} transparent depthWrite={false} blending={AdditiveBlending} />
        </mesh>
      ))}
    </GalacticLabelLayer>
  );
}
