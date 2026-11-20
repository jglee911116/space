import { useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Points, PointsMaterial, ShaderMaterial } from 'three';
import type { OortCloud } from '@/constants/space';
import { UNITS_PER_AU } from '../utils/orbit';

const POINT_COUNT = 5600;
const ORIGIN = new Float32Array([0, 0, 0]);

const vertexShader = /* glsl */ `
  attribute float grain;
  uniform float pixelRatio;
  varying float brightness;

  void main() {
    brightness = mix(0.25, 0.90, grain * grain);
    gl_PointSize = mix(1.15, 2.3, grain) * pixelRatio;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float layerOpacity;
  varying float brightness;

  void main() {
    float edge = 1.0 - smoothstep(0.12, 0.5, length(gl_PointCoord - 0.5));
    gl_FragColor = vec4(0.53, 0.70, 0.92, edge * brightness * layerOpacity);
  }
`;

function sampleShell(innerEdgeAu: number, outerEdgeAu: number) {
  const positions = new Float32Array(POINT_COUNT * 3);
  const grains = new Float32Array(POINT_COUNT);
  let seed = 29417;

  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  }

  const innerVolume = innerEdgeAu ** 3;
  const volumeRange = outerEdgeAu ** 3 - innerVolume;
  for (let index = 0; index < POINT_COUNT; index++) {
    const y = random() * 2 - 1;
    const angle = random() * 2 * Math.PI;
    const radius = Math.cbrt(innerVolume + random() * volumeRange) * UNITS_PER_AU;
    const ring = radius * Math.sqrt(1 - y ** 2);
    positions[index * 3] = ring * Math.cos(angle);
    positions[index * 3 + 1] = radius * y;
    positions[index * 3 + 2] = ring * Math.sin(angle);
    grains[index] = random();
  }

  return { positions, grains };
}

export function OortCloudModel({ cloud, opacity }: { cloud: OortCloud; opacity: RefObject<number> }) {
  const dots = useRef<Points>(null);
  const sun = useRef<Points>(null);
  const dotMaterial = useRef<ShaderMaterial>(null);
  const sunMaterial = useRef<PointsMaterial>(null);
  const innerEdgeAu = cloud.innerEdgeAu[0];
  const outerEdgeAu = cloud.outerEdgeAu[1];
  const model = useMemo(() => sampleShell(innerEdgeAu, outerEdgeAu), [innerEdgeAu, outerEdgeAu]);
  const dpr = useThree((state) => state.viewport.dpr);
  const uniforms = useMemo(() => ({ pixelRatio: { value: dpr }, layerOpacity: { value: 0 } }), [dpr]);

  useFrame(() => {
    const alpha = opacity.current;
    if (dots.current) dots.current.visible = alpha > 0.002;
    if (sun.current) sun.current.visible = alpha > 0.002;
    if (dotMaterial.current) dotMaterial.current.uniforms.layerOpacity.value = alpha;
    if (sunMaterial.current) sunMaterial.current.opacity = alpha;
  });

  return (
    <>
      <points ref={dots} raycast={() => {}}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[model.positions, 3]} />
          <bufferAttribute attach="attributes-grain" args={[model.grains, 1]} />
        </bufferGeometry>
        <shaderMaterial ref={dotMaterial} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} transparent depthWrite={false} />
      </points>
      <points ref={sun} renderOrder={1} raycast={() => {}}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ORIGIN, 3]} />
        </bufferGeometry>
        <pointsMaterial ref={sunMaterial} color="#ffc688" size={5} sizeAttenuation={false} transparent depthTest={false} depthWrite={false} />
      </points>
    </>
  );
}
