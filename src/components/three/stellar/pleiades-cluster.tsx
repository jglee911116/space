import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, Vector3, type Points, type ShaderMaterial } from 'three';
import { previewVisibility } from '../maps/map-detail';
import { seededRandom } from '../../utils/random';

// Approximate sky projection around Alcyone. The depth is illustrative.
const brightStars = [
  [0, 0, 0.12, 1],
  [0.51, -0.18, 0.03, 0.75],
  [0.51, -0.07, 0.08, 0.43],
  [-0.19, -0.24, -0.1, 0.65],
  [-0.24, 0.2, 0.13, 0.72],
  [-0.5, -0.12, -0.04, 0.72],
  [-0.49, 0.34, -0.13, 0.58],
  [-0.56, 0.16, 0.16, 0.37],
  [-0.31, 0.49, -0.17, 0.34],
] as const;

const vertex = /* glsl */ `
  uniform float viewport;
  attribute float size;
  attribute float intensity;
  attribute float stellar;
  varying vec3 tint;
  varying float brightness;
  varying float star;

  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * view;
    float radius = length(modelViewMatrix[0].xyz);
    gl_PointSize = clamp(size * radius * viewport * projectionMatrix[1][1] / max(-view.z, 0.01), 1.0, 100.0);
    tint = color;
    brightness = intensity;
    star = stellar;
  }
`;

const fragment = /* glsl */ `
  uniform float visibility;
  varying vec3 tint;
  varying float brightness;
  varying float star;

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(p, p);
    if (r2 > 1.0) discard;
    float profile = exp(-6.1 * r2) * (1.0 - smoothstep(0.30, 1.0, r2));
    float core = exp(-122.0 * r2);
    float glow = star > 0.5 ? 0.26 * profile + 0.82 * core : profile;
    gl_FragColor = vec4(mix(tint, vec3(0.92, 0.97, 1.0), core * star * 0.68), glow * brightness * visibility);
    #include <colorspace_fragment>
  }
`;

function clusterGeometry(preview: boolean) {
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const intensities: number[] = [];
  const stars: number[] = [];
  const random = seededRandom(45143);
  const blue = new Color('#628fd9');
  const pale = new Color('#c5dcff');
  const warm = new Color('#e2c6a0');
  const color = new Color();
  function push(x: number, y: number, z: number, size: number, intensity: number, star: number) {
    positions.push(x, y, z);
    colors.push(color.r, color.g, color.b);
    sizes.push(size);
    intensities.push(intensity);
    stars.push(star);
  }
  for (const [x, y, z, brightness] of brightStars) {
    color.copy(pale).lerp(blue, (1 - brightness) * 0.25);
    push(x, y, z, 0.052 + 0.19 * brightness, 0.72 + brightness * 0.28, 1);
  }
  for (let i = 0; i < (preview ? 140 : 760); i++) {
    const angle = random() * Math.PI * 2;
    const radius = random() ** 0.86 * 0.94;
    color.copy(pale).lerp(random() < 0.27 ? warm : blue, random() * 0.65);
    push(Math.cos(angle) * radius - 0.08, Math.sin(angle) * radius * 0.82, (random() - 0.5) * (0.3 + radius * 0.73), 0.012 + random() ** 4 * 0.04, 0.2 + random() ** 2 * 0.48, 1);
  }
  for (let i = 0; i < (preview ? 450 : 2800); i++) {
    const lane = i % 7;
    const distance = random() * 1.4 - 0.72;
    const spread = (random() - 0.5) * 0.11;
    const x = distance * 0.91 - 0.12 + spread;
    const y = distance * 0.46 - 0.37 + lane * 0.12 + 0.07 * Math.sin(distance * 5 + lane * 0.8) + spread;
    const z = (lane - 3) * 0.079 + 0.17 * Math.sin(distance * 3.4 + lane * 0.72) + spread * 2.2;
    const nearMerope = Math.exp(-5 * ((x + 0.19) ** 2 + (y + 0.24) ** 2));
    color.copy(blue).lerp(pale, nearMerope * 0.45);
    push(x, y, z, 0.031 + random() * 0.061, (preview ? 0.13 : 0.053) * (0.24 + 0.76 * nearMerope) * Math.sin(((distance + 0.72) / 1.4) * Math.PI), 0);
  }
  return [positions, colors, sizes, intensities, stars].map((values) => new Float32Array(values));
}

export function PleiadesCluster({ radius, preview = false }: { radius: number; preview?: boolean }) {
  const points = useRef<Points>(null);
  const material = useRef<ShaderMaterial>(null);
  const position = useMemo(() => new Vector3(), []);
  const [positions, colors, sizes, intensities, stars] = useMemo(() => clusterGeometry(preview), [preview]);
  const uniforms = useMemo(() => ({ visibility: { value: preview ? 0 : 1 }, viewport: { value: 1 } }), [preview]);
  useFrame(({ camera, gl, size }) => {
    if (!points.current || !material.current) return;
    const shader = material.current.uniforms;
    shader.viewport.value = size.height * gl.getPixelRatio() * 0.5;
    if (!preview) return;
    points.current.getWorldPosition(position).applyMatrix4(camera.matrixWorldInverse);
    const visibility = previewVisibility(radius * 2, -position.z, camera, size.height);
    shader.visibility.value = visibility;
    points.current.visible = visibility > 0;
  });
  return (
    <points ref={points} scale={radius} raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-intensity" args={[intensities, 1]} />
        <bufferAttribute attach="attributes-stellar" args={[stars, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} vertexColors transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  );
}
