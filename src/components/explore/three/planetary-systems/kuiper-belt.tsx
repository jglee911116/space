import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import type { Points, ShaderMaterial } from 'three';
import { UNITS_PER_AU } from '../../utils/orbit';

const BODY_COUNT = 4200;

const vertexShader = /* glsl */ `
  attribute float grain;
  uniform float pixelRatio;
  varying float brightness;
  varying vec3 tint;

  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * view;
    float detail = clamp(900.0 / max(1.0, -view.z), 0.36, 1.0);
    gl_PointSize = pixelRatio * mix(1.0, 2.85, grain * grain * detail);
    brightness = mix(0.17, 0.78, grain * grain);
    tint = mix(vec3(0.29, 0.43, 0.64), vec3(0.72, 0.57, 0.46), smoothstep(0.48, 0.97, grain));
  }
`;

const fragmentShader = /* glsl */ `
  uniform float layerOpacity;
  varying float brightness;
  varying vec3 tint;

  void main() {
    float r = length(2.0 * gl_PointCoord - 1.0);
    float light = 1.0 - smoothstep(0.16, 1.0, r);
    gl_FragColor = vec4(tint, brightness * light * layerOpacity);
    #include <colorspace_fragment>
  }
`;

function sampleBelt(innerAu: number, outerAu: number) {
  const positions = new Float32Array(BODY_COUNT * 3);
  const grains = new Float32Array(BODY_COUNT);
  let seed = 31991;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  }

  for (let index = 0; index < BODY_COUNT; index++) {
    const broadOrbit = random() < 0.23;
    const fraction = broadOrbit ? (random() + random()) * 0.5 : 0.15 + 0.84 * (random() + random() + random()) / 3;
    const radius = (innerAu + (outerAu - innerAu) * fraction) * UNITS_PER_AU;
    const longitude = random() * 2 * Math.PI;
    const latitude = (random() - random()) * (broadOrbit ? 0.29 : 0.085);
    const planeRadius = radius * Math.cos(latitude);
    positions.set([planeRadius * Math.cos(longitude), radius * Math.sin(latitude), planeRadius * Math.sin(longitude)], index * 3);
    grains[index] = random();
  }
  return { positions, grains };
}

export function KuiperBelt({ beltAu: [innerAu, outerAu], opacity }: { beltAu: readonly [number, number]; opacity: RefObject<number> }) {
  const points = useRef<Points>(null);
  const material = useRef<ShaderMaterial>(null);
  const model = useMemo(() => sampleBelt(innerAu, outerAu), [innerAu, outerAu]);
  const dpr = useThree((state) => state.viewport.dpr);
  const uniforms = useMemo(() => ({ pixelRatio: { value: dpr }, layerOpacity: { value: 0 } }), [dpr]);

  useFrame(() => {
    if (points.current) points.current.visible = opacity.current > 0.002;
    if (material.current) material.current.uniforms.layerOpacity.value = opacity.current;
  });

  return (
    <points ref={points} raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[model.positions, 3]} />
        <bufferAttribute attach="attributes-grain" args={[model.grains, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} />
    </points>
  );
}
