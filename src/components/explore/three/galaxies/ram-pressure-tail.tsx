import { useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { AdditiveBlending } from 'three';

const vertex = /* glsl */ `
  attribute float grain;
  uniform float focalPixels;
  uniform float galaxyRadius;
  varying float light;
  varying float knot;

  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    float pixelRadius = focalPixels * galaxyRadius / max(0.001, -view.z);
    knot = smoothstep(0.94, 0.997, grain);
    light = (0.028 + 0.05 * grain + 0.31 * knot) * (1.0 - smoothstep(0.75, 2.9, abs(position.x) / galaxyRadius));
    gl_PointSize = clamp(pixelRadius * mix(0.11, 0.019, knot), 1.3, 34.0);
    gl_Position = projectionMatrix * view;
  }
`;

const fragment = /* glsl */ `
  varying float light;
  varying float knot;

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r = dot(p, p);
    float alpha = exp(-4.2 * r) * (1.0 - smoothstep(0.45, 1.0, r));
    gl_FragColor = vec4(mix(vec3(0.13, 0.31, 0.72), vec3(0.73, 0.87, 1.0), knot), alpha * light);
    #include <colorspace_fragment>
  }
`;

export function RamPressureTail({ radius, twin }: { radius: number; twin: boolean }) {
  const height = useThree((state) => state.size.height);
  const dpr = useThree((state) => state.viewport.dpr);
  const { positions, grains } = useMemo(() => {
    const count = twin ? 2400 : 1250;
    const positions = new Float32Array(count * 3);
    const grains = new Float32Array(count);
    let seed = twin ? 137001 : 137002;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let index = 0; index < count; index++) {
      const t = random() ** 1.3;
      const branch = twin && index % 2 ? -1 : 1;
      const width = (0.035 + 0.24 * t) * Math.sqrt(random());
      const angle = random() * Math.PI * 2;
      const y = (0.22 + 0.25 * branch) * t + width * Math.cos(angle);
      const z = branch * (0.14 + 0.34 * t) + 0.07 * Math.sin(t * 15 + branch) + width * Math.sin(angle);
      positions.set([-radius * (0.30 + (twin ? 2.55 : 1.82) * t), y * radius, z * radius], index * 3);
      grains[index] = random();
    }
    return { positions, grains };
  }, [radius, twin]);
  const uniforms = useMemo(() => ({ focalPixels: { value: 1.2 * height * dpr }, galaxyRadius: { value: radius } }), [dpr, height, radius]);
  return (
    <points raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-grain" args={[grains, 1]} />
      </bufferGeometry>
      <shaderMaterial uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  );
}
