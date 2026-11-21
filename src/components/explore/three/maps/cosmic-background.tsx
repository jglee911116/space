import { useThree } from '@react-three/fiber';
import { useMemo } from 'react';

const STAR_COUNT = 1900;

const vertexShader = /* glsl */ `
  attribute float grain;
  uniform float pixelRatio;
  varying float brightness;

  void main() {
    // Use only camera rotation so the backdrop stays distant at every map scale.
    vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
    clip.z = clip.w * 0.999998;
    gl_Position = clip;
    gl_PointSize = pixelRatio * mix(1.15, 2.65, grain * grain);
    brightness = mix(0.24, 0.79, grain * grain);
  }
`;

const fragmentShader = /* glsl */ `
  varying float brightness;

  void main() {
    float edge = 1.0 - smoothstep(0.12, 0.5, length(gl_PointCoord - 0.5));
    gl_FragColor = vec4(0.77, 0.82, 0.94, edge * brightness);
  }
`;

function sampleSky() {
  const positions = new Float32Array(STAR_COUNT * 3);
  const grains = new Float32Array(STAR_COUNT);
  let seed = 51483;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  }
  for (let index = 0; index < STAR_COUNT; index++) {
    const y = random() * 2 - 1;
    const radius = Math.sqrt(1 - y * y);
    const azimuth = random() * 2 * Math.PI;
    positions.set([radius * Math.cos(azimuth), y, radius * Math.sin(azimuth)], index * 3);
    grains[index] = random();
  }
  return { positions, grains };
}

export function CosmicBackground() {
  const { positions, grains } = useMemo(() => sampleSky(), []);
  const dpr = useThree((state) => state.viewport.dpr);
  const uniforms = useMemo(() => ({ pixelRatio: { value: dpr } }), [dpr]);
  return (
    <points frustumCulled={false} renderOrder={-100} raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-grain" args={[grains, 1]} />
      </bufferGeometry>
      <shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} />
    </points>
  );
}
