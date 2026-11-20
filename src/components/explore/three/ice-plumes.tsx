import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, type ShaderMaterial } from 'three';

const vertex = /* glsl */ `
  uniform float time;
  uniform float radius;
  varying float fade;

  void main() {
    float age = fract(position.z + time * (0.20 + 0.08 * abs(position.x)));
    vec2 vent = position.xy;
    vec2 drift = (vec2(sin(position.z * 137.0), cos(position.z * 193.0))) * age * 0.18;
    vec3 point = radius * vec3(vent.x * (1.0 + 0.8 * age) + drift.x,
                               -sqrt(1.0 - dot(vent, vent)) - age * (0.72 + 0.4 * position.z),
                               vent.y * (1.0 + 0.8 * age) + drift.y);
    vec4 view = modelViewMatrix * vec4(point, 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = clamp(radius * 28.0 / -view.z, 1.0, 3.5);
    fade = smoothstep(0.0, 0.10, age) * (1.0 - age) * 0.31;
  }
`;

const fragment = /* glsl */ `
  varying float fade;

  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    gl_FragColor = vec4(0.55, 0.79, 1.0, fade * (1.0 - smoothstep(0.13, 1.0, r)));
    #include <colorspace_fragment>
  }
`;

export function IcePlumes({ radius, paused }: { radius: number; paused: boolean }) {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ radius: { value: radius }, time: { value: 0 } }), [radius]);
  const positions = useMemo(() => new Float32Array(Array.from({ length: 280 }, (_, index) => {
    const stripe = index % 4;
    return [(stripe - 1.5) * 0.095 + 0.018 * Math.sin(index * 5.1), 0.18 * Math.sin(index * 8.7), ((index * 89) % 281) / 281];
  }).flat()), []);

  useFrame((_, delta) => {
    if (material.current && !paused) material.current.uniforms.time.value += Math.min(delta, 0.1);
  });

  return (
    <points frustumCulled={false} raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  );
}
