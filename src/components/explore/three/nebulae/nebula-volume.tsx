import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { BackSide, MathUtils, Vector3, type Mesh, type ShaderMaterial, type Texture } from 'three';
import { previewVisibility } from '../maps/map-detail';
import { REALTIME_DAYS_PER_SECOND } from '../../utils/orbit';
import { apepDustDensity, bipolarJetDensity, cartwheelDensity, edgeOnDiskDensity, hourglassDensity, shockedShellDensity, southernRingDensity } from './webb-nebula-density';
import { catsEyeDensity, homunculusDensity, lightEchoDensity } from './hubble-nebula-density';
import { butterflyDensity, debrisDiskDensity, velaWindDensity } from './observed-structure-density';
import { horseheadDensity, tychoShellDensity, wolfRayetDensity } from './observed-cloud-density';
import { helixDensity, sn1006ShellDensity } from './helix-and-sn1006-density';
import { ngc346Density } from './ngc-346-density';
import { jewelBugDensity } from './jewel-bug-density';
import { windBubbleDensity, oxygenRemnantDensity } from './wind-and-oxygen-density';
import { quintetDensity } from '../galaxies/quintet-density';
import { galaxyMergerDensity } from '../galaxies/merger-density';
import { protostarBowsDensity, symbioticOutflowDensity } from './stellar-outflow-density';
import { betelgeusePlumeDensity } from '../stellar/betelgeuse-plume';
import { STELLAR_WIND_FADE, STELLAR_WIND_RADIUS, rigelWindDensity, solarWindDensity } from '../stellar/stellar-wind-density';
import { spatialNoise } from '../shared/shaders';

const vertex = /* glsl */ `
  varying vec3 boxPoint;
  varying vec3 localEye;
  varying float viewZ;

  void main() {
    boxPoint = position;
    localEye = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    viewZ = view.z;
    gl_Position = projectionMatrix * view;
  }
`;

const crabDensity = /* glsl */ `
  vec4 density(vec3 p) {
    float shape = length(p / vec3(0.91, 0.94, 0.77));
    if (shape > 1.08) return vec4(0.0);

    // The Webb image supplies color and fine structure. Depth comes from
    // the asymmetric 3D density field, with different sampling on the two sides.
    float mass = noise(p * 4.4 + vec3(2.0, -3.0, 7.0));
    vec3 warp = p + 0.12 * vec3(mass - 0.5, sin(p.z * 5.0 + p.x * 3.0), cos(p.y * 5.0 - p.x * 4.0));
    vec2 uv = 0.5 + vec2(warp.x + warp.z * 0.23, warp.y - warp.z * 0.13) * 0.46;
    vec3 mapped = observe(uv, 0.0, vec3(0.15, 0.27, 0.43));
    float brightness = dot(mapped, vec3(0.2126, 0.7152, 0.0722));
    float shellDistance = shape - 0.70 - 0.16 * (mass - 0.5);
    float shell = exp(-18.0 * shellDistance * shellDistance);
    float envelope = (1.0 - smoothstep(0.72, 1.07, shape)) * smoothstep(0.16, 0.67, mass);
    float cloud = smoothstep(0.20, 0.72, noise(warp * vec3(8.0, 11.0, 10.0)));
    float thread = 1.0 - smoothstep(0.0, 0.16, abs(noise(warp * 17.0) - 0.51));
    float gas = envelope * (0.45 + 0.65 * cloud) * (0.22 + brightness * 0.95);
    float filaments = envelope * shell * thread * smoothstep(0.34, 0.70, cloud);
    vec3 blue = mix(vec3(0.027, 0.15, 0.26), vec3(0.19, 0.53, 0.74), brightness);
    vec3 color = mix(blue, mapped * 1.35, 0.71);
    color = mix(color, mix(vec3(0.55, 0.16, 0.050), vec3(1.0, 0.57, 0.28), cloud), clamp(filaments * 2.7, 0.0, 0.83));
    return vec4(color, gas * 2.2 + filaments * 1.6);
  }
`;

const ringDensity = /* glsl */ `
  vec4 density(vec3 p) {
    // An inclined open barrel, with irregular walls and open ends.
    vec3 q = vec3(p.x, p.y * 0.94 + p.z * 0.342, p.z * 0.94 - p.y * 0.342);
    float radial = length(q.xy / vec2(1.0, 0.88));
    float axial = abs(q.z);
    if (radial > 0.97 || axial > 0.79) return vec4(0.0);
    float knots = noise(q * 13.0);
    float surface = radial - 0.56 - 0.12 * axial - (knots - 0.5) * 0.052;
    float shell = exp(-132.0 * surface * surface) * (1.0 - smoothstep(0.30, 0.64, axial));
    float outer = radial - 0.76;
    float halo = 0.23 * exp(-118.0 * outer * outer) * (1.0 - smoothstep(0.19, 0.53, axial));
    float inner = 1.0 - smoothstep(0.38, 1.0, length(q / vec3(0.31, 0.28, 0.78)));
    vec2 uv = 0.5 + (p.xy + vec2(q.z * 0.14, -q.z * 0.11) + 0.07 * vec2(knots - 0.5, noise(q * 9.0) - 0.5)) * 0.48;
    vec3 image = observe(uv, 1.6, vec3(0.09, 0.31, 0.42));
    float detail = noise(q * 27.0);
    vec3 base = mix(vec3(0.023, 0.43, 0.52), vec3(0.85, 0.31, 0.18), smoothstep(-0.02, 0.16, surface));
    vec3 color = mix(base, image * 1.35, 0.44);
    return vec4(color, (5.8 * shell + 2.0 * halo + 0.26 * inner) * (0.31 + 0.69 * knots) * (0.52 + 0.66 * detail));
  }
`;

const pillarsDensity = /* glsl */ `
  float column(vec3 p, vec2 base, float height, float width, vec2 bend) {
    float y = (p.y + 0.75) / height;
    if (y < -0.18 || y > 1.02) return 0.0;
    float t = clamp(y, 0.0, 1.0);
    vec2 axis = base + bend * t + vec2(0.08 * sin(t * 4.1), -0.06 * sin(t * 5.4));
    float radius = width * (1.25 - 0.60 * t + 0.15 * sin(t * 14.0));
    radius *= sqrt(max(0.03, 1.0 - pow(smoothstep(0.84, 1.0, t), 2.0)));
    float boundary = length((p.xz - axis) / vec2(1.0, 0.86)) / radius + 0.28 * (noise(p * 18.0) - 0.5);
    return (1.0 - smoothstep(0.49, 1.22, boundary)) * smoothstep(-0.16, 0.03, y) * (1.0 - smoothstep(0.97, 1.02, y));
  }

  vec4 density(vec3 p) {
    float pillars = max(column(p, vec2(-0.58, -0.12), 1.58, 0.24, vec2(0.65, 0.11)),
                        column(p, vec2(-0.05, 0.39), 1.19, 0.155, vec2(0.53, -0.11)));
    pillars = max(pillars, column(p, vec2(0.32, -0.43), 0.82, 0.14, vec2(0.46, 0.14)));
    float base = 0.50 * (1.0 - smoothstep(0.46, 1.0, length(vec3(p.x * 1.12, (p.y + 0.82) * 4.2, p.z * 1.35))));
    if (pillars + base < 0.002) return vec4(0.0);
    float turbulence = noise(p * vec3(26.0, 15.0, 23.0));
    float clumps = noise(p * 9.0);
    vec2 uv = 0.5 + (p.xy + vec2(p.z * 0.18, -p.z * 0.12) + vec2(turbulence - 0.5, clumps - 0.5) * 0.10) * 0.49;
    vec3 image = observe(uv, 1.8, vec3(0.45, 0.21, 0.09));
    float rim = (1.0 - smoothstep(0.12, 0.81, pillars)) * (0.4 + 0.6 * turbulence);
    vec3 dust = mix(vec3(0.24, 0.077, 0.035), vec3(0.88, 0.43, 0.16), rim);
    float light = 0.72 + 0.28 * smoothstep(-0.55, 0.60, p.z - 0.4 * p.x);
    vec3 color = mix(dust, image * 1.25, 0.23 + 0.19 * clumps) * light;
    return vec4(color, (pillars * 13.5 + base * 3.2) * (0.28 + 0.90 * turbulence + 0.31 * clumps));
  }
`;

const ejectaDensity = /* glsl */ `
  float ringBand(vec3 p, float radius, float height, float width) {
    float radial = (length(p.xy / vec2(1.0, 0.91)) - radius) / width;
    float axial = (p.z - height) / (width * 0.78);
    return exp(-(radial * radial + axial * axial) * 2.0);
  }

  vec4 density(vec3 p) {
    vec3 q = vec3(p.x, p.y * 0.72 + p.z * 0.69, p.z * 0.72 - p.y * 0.69);
    if (length(q) > 0.98) return vec4(0.0);
    float knots = noise(q * 18.0);
    float brightRing = ringBand(q, 0.44, 0.0, 0.089);
    float outer = ringBand(q + vec3(0.10, 0.0, 0.0), 0.54, 0.43, 0.063)
                + ringBand(q - vec3(0.08, 0.0, 0.0), 0.54, -0.43, 0.063);
    float core = 1.0 - smoothstep(0.13, 1.0, length(q / vec3(0.25, 0.24, 0.23)));
    vec3 image = observe(0.5 + p.xy * 0.49, 2.0, vec3(0.63, 0.28, 0.09));
    vec3 line = mix(vec3(0.75, 0.22, 0.08), vec3(1.0, 0.67, 0.31), knots);
    vec3 color = mix(line, image * 1.55, clamp(brightRing * 0.42 + core * 0.48, 0.0, 0.72));
    return vec4(color, brightRing * (8.0 + 17.0 * knots) + outer * (2.2 + knots * 2.2) + core * 1.7);
  }
`;

const stellarNurseryDensity = /* glsl */ `
  vec4 density(vec3 p) {
    float shape = length(p / vec3(0.96, 0.91, 0.73));
    if (shape > 1.03) return vec4(0.0);
    float mass = noise(p * 4.2);
    vec3 warp = p + vec3(noise(p * 5.0 + 9.0), mass, noise(p * 5.0 + 15.0)) * 0.20 - 0.10;
    vec2 uv = 0.5 + warp.xy * 0.49 + warp.z * vec2(0.18, -0.11);
    vec3 image = observe(uv, 1.8, vec3(0.32, 0.18, 0.33));
    float clumps = smoothstep(0.29, 0.73, noise(warp * vec3(10.0, 14.0, 12.0)));
    float envelope = (1.0 - smoothstep(0.61, 1.03, shape)) * smoothstep(0.18, 0.77, mass);
    float cavity = smoothstep(0.14, 0.68, length((warp - vec3(0.17, 0.05, 0.08)) * vec3(1.2, 1.0, 1.36)));
    vec3 dust = mix(vec3(0.085, 0.12, 0.27), vec3(0.74, 0.28, 0.13), clumps);
    vec3 color = mix(dust, image * 1.60, 0.57);
    return vec4(color, 5.5 * envelope * cavity * (0.24 + 0.76 * clumps));
  }
`;

const densityByShape = {
  crab: crabDensity,
  ring: ringDensity,
  pillars: pillarsDensity,
  ejecta: ejectaDensity,
  nursery: stellarNurseryDensity,
  hourglass: hourglassDensity,
  'bipolar-jet': bipolarJetDensity,
  'shocked-shell': shockedShellDensity,
  'southern-ring': southernRingDensity,
  'dust-spiral': apepDustDensity,
  'edge-on-disk': edgeOnDiskDensity,
  homunculus: homunculusDensity,
  'light-echo': lightEchoDensity,
  'cats-eye': catsEyeDensity,
  'debris-disk': debrisDiskDensity,
  'vela-wind': velaWindDensity,
  butterfly: butterflyDensity,
  horsehead: horseheadDensity,
  'wolf-rayet-ejecta': wolfRayetDensity,
  'tycho-shell': tychoShellDensity,
  helix: helixDensity,
  'sn-1006-shell': sn1006ShellDensity,
  'ngc-346-ridges': ngc346Density,
  'jewel-bug': jewelBugDensity,
  'wind-bubble': windBubbleDensity,
  'oxygen-remnant': oxygenRemnantDensity,
  quintet: quintetDensity,
  merger: galaxyMergerDensity,
  'symbiotic-outflow': symbioticOutflowDensity,
  'protostar-bows': protostarBowsDensity,
  'betelgeuse-plume': betelgeusePlumeDensity,
  'rigel-wind': rigelWindDensity,
  'solar-wind': solarWindDensity,
  cartwheel: cartwheelDensity,
};
export type NebulaVolumeShape = keyof typeof densityByShape;
const stellarWindShapes = new Set<NebulaVolumeShape>(['betelgeuse-plume', 'rigel-wind', 'solar-wind']);

function fragment(shape: NebulaVolumeShape, preview: boolean) {
  return /* glsl */ `
  varying vec3 boxPoint;
  varying vec3 localEye;
  varying float viewZ;
  uniform sampler2D observation;
  uniform bool mapped;
  uniform float visibility;
  uniform float motion;
  uniform mat4 projectionMatrix;

  ${spatialNoise}
  vec3 observe(vec2 uv, float bias, vec3 fallback) {
    return mapped ? texture2D(observation, clamp(uv, 0.002, 0.998), bias).rgb : fallback;
  }

  ${shape === 'crab' ? '#define CRAB_VOLUME' : ''}
  ${densityByShape[shape]}

  void main() {
    vec3 eye = localEye;
    float rayLength = length(boxPoint - eye);
    vec3 direction = (boxPoint - eye) / rayLength;
    vec3 inverseDirection = 1.0 / (direction + vec3(0.000001));
    vec3 bounds = ${shape === 'cartwheel' ? 'vec3(1.0, 1.0, 0.30)' : shape === 'cats-eye' || shape === 'quintet' ? 'vec3(1.0, 1.0, 0.80)' : 'vec3(1.0)'};
    vec3 a = (-bounds - eye) * inverseDirection;
    vec3 b = ( bounds - eye) * inverseDirection;
    vec3 entry = min(a, b);
    vec3 exit = max(a, b);
    float start = max(0.0, max(entry.x, max(entry.y, entry.z)));
    float end = min(exit.x, min(exit.y, exit.z));
    ${
      stellarWindShapes.has(shape)
        ? `
      // Integrate only the gas in front of the opaque photosphere.
      float closest = -dot(eye, direction);
      float impact = dot(eye, eye) - closest * closest;
      float disk = ${(1 / STELLAR_WIND_RADIUS ** 2).toFixed(8)} - impact;
      if (closest > 0.0 && disk > 0.0) end = min(end, closest - sqrt(disk));
    `
        : ''
    }
    if (end <= start) discard;

    const int steps = ${preview ? 28 : shape === 'quintet' || shape === 'butterfly' || shape === 'light-echo' || shape === 'horsehead' || shape === 'tycho-shell' || shape === 'sn-1006-shell' || shape === 'wolf-rayet-ejecta' ? 64 : shape === 'cats-eye' ? 54 : 44};
    float stepSize = (end - start) / float(steps);
    vec3 accumulated = vec3(0.0);
    float transmission = 1.0;
    float frontDepth = end;
    float sampleOffset = 0.5;
    #ifndef CRAB_VOLUME
      // Stagger samples across pixels to avoid visible slices at grazing angles.
      sampleOffset = 0.17 + 0.66 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    #endif
    for (int i = 0; i < steps; ++i) {
      float sampleDistance = start + (float(i) + sampleOffset) * stepSize;
      vec3 p = eye + direction * sampleDistance;
      vec4 samplePoint = density(p);
      float alpha = 1.0 - exp(-stepSize * samplePoint.a);
      accumulated += transmission * alpha * samplePoint.rgb;
      transmission *= 1.0 - alpha;
      if (frontDepth == end && transmission < 0.96) frontDepth = sampleDistance;
      if (transmission < 0.02) break;
    }

    float opacity = 1.0 - transmission;
    if (opacity * visibility < 0.003) discard;
    // Depth-test against the first visible gas, rather than the box's far face.
    vec4 clip = projectionMatrix * vec4(0.0, 0.0, viewZ * frontDepth / rayLength, 1.0);
    gl_FragDepth = clamp(0.5 + 0.5 * clip.z / clip.w, 0.0, 1.0);
    gl_FragColor = vec4(accumulated / opacity, opacity * visibility);
    #include <colorspace_fragment>
  }
`;
}

export function NebulaVolume({
  texture,
  radius,
  shape,
  preview = false,
  paused = true,
  daysPerSecond = REALTIME_DAYS_PER_SECOND,
  activityDays,
}: {
  texture?: Texture;
  radius: number;
  shape: NebulaVolumeShape;
  preview?: boolean;
  paused?: boolean;
  daysPerSecond?: number;
  activityDays?: RefObject<number>;
}) {
  const mesh = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);
  const position = useMemo(() => new Vector3(), []);
  const initialPhase = shape === 'light-echo' ? 4 : 0;
  const motion = useRef(initialPhase);
  const activityStart = useRef<number | null>(null);
  const rate = Math.max(0.18, 1 + 0.32 * Math.log10(daysPerSecond / REALTIME_DAYS_PER_SECOND));
  const uniforms = useMemo(
    () => ({
      observation: { value: texture ?? null },
      mapped: { value: texture !== undefined },
      visibility: { value: 1 },
      motion: { value: initialPhase },
    }),
    [texture, initialPhase],
  );

  useFrame(({ camera, size }, delta) => {
    if (!mesh.current || !material.current) return;
    if (stellarWindShapes.has(shape)) {
      if (activityDays) {
        activityStart.current ??= activityDays.current;
        motion.current = (activityDays.current - activityStart.current) * 2400;
      } else if (!paused) {
        motion.current += Math.min(delta, 0.1) * rate * (shape === 'rigel-wind' ? 1.05 : 0.65);
      }
      mesh.current.getWorldPosition(position);
      const distanceInStellarRadii = (camera.position.distanceTo(position) * STELLAR_WIND_RADIUS) / radius;
      const visibility = 1 - MathUtils.smoothstep(distanceInStellarRadii, ...STELLAR_WIND_FADE);
      mesh.current.visible = visibility > 0;
      material.current.uniforms.visibility.value = visibility;
      material.current.uniforms.motion.value = motion.current;
    } else if (
      !preview &&
      (shape === 'bipolar-jet' ||
        shape === 'shocked-shell' ||
        shape === 'dust-spiral' ||
        shape === 'edge-on-disk' ||
        shape === 'light-echo' ||
        shape === 'vela-wind' ||
        shape === 'symbiotic-outflow' ||
        shape === 'protostar-bows')
    ) {
      if (!paused) {
        const elapsed = motion.current + Math.min(delta, 0.1) * rate;
        if (shape === 'shocked-shell') motion.current = Math.min(elapsed, 18);
        else if (shape === 'dust-spiral') motion.current = Math.min(elapsed, 16);
        else motion.current = elapsed % (shape === 'light-echo' ? 14 : (2 * Math.PI) / 5);
      }
      material.current.uniforms.motion.value = motion.current;
    }
    if (!preview) return;
    mesh.current.getWorldPosition(position).applyMatrix4(camera.matrixWorldInverse);
    const visibility = previewVisibility(radius * 2, -position.z, camera, size.height);
    mesh.current.visible = visibility > 0;
    material.current.uniforms.visibility.value = visibility;
  });

  const fragmentShader = useMemo(() => fragment(shape, preview), [shape, preview]);
  return (
    <mesh ref={mesh} scale={radius} raycast={() => {}}>
      <boxGeometry args={[2, 2, 2]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragmentShader} transparent depthWrite={false} side={BackSide} />
    </mesh>
  );
}
