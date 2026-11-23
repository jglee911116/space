import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, DoubleSide, type ShaderMaterial, type Texture } from 'three';
import { StellarGlow } from '../stellar/stellar-glow';

const vertexShader = /* glsl */ `
  varying vec2 wind;
  uniform float phase;

  void main() {
    wind = uv * 2.0 - 1.0;
    float r = length(wind);
    float angle = atan(wind.y, wind.x + 0.00001);
    vec3 surface = position;
    surface.z += smoothstep(0.12, 0.52, r) *
      (0.22 * sin(angle + r * 6.0) + 0.12 * sin(3.0 * angle - phase + r * 9.0));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(surface, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 wind;
  uniform float phase;
  uniform sampler2D observation;
  uniform bool mapped;

  float gaussian(float value) {
    return exp(-value * value);
  }

  void main() {
    vec2 p = wind * vec2(1.0, 1.12);
    float r = length(p);
    if (r >= 0.99) discard;
    float angle = atan(p.y, p.x + 0.00001);
    float drift = fract(r * 5.8 - phase / 6.2831853 + 0.13 * sin(2.0 * angle + r * 8.0));
    float fine = fract(r * 10.4 - phase / 6.2831853 + 0.13 * sin(3.0 * angle - r * 10.0));
    float wisps = gaussian((drift - 0.48) / 0.11) + 0.20 * gaussian((fine - 0.47) / 0.14);
    float front = 0.32 + 0.68 * pow(0.5 + 0.5 * cos(angle + 1.1), 1.45);
    float breaks = 0.42 + 0.58 * pow(0.5 + 0.5 * cos(3.0 * angle - r * 13.0 + 0.3 * sin(5.0 * angle)), 1.6);
    float envelope = smoothstep(0.12, 0.27, r) * (1.0 - smoothstep(0.60, 0.97, r));
    vec3 image = mapped ? texture2D(observation, vec2(0.52, 0.50) + p * 0.14).rgb : vec3(0.22, 0.35, 0.47);
    float observedLight = dot(image, vec3(0.2126, 0.7152, 0.0722));
    vec3 tint = mix(vec3(0.10, 0.41, 0.65), vec3(0.78, 0.91, 1.0), front * 0.88);
    tint = mix(tint, image * 1.55, 0.24);
    float haze = 0.14 * gaussian((r - 0.46) / 0.28) * (0.48 + observedLight);
    gl_FragColor = vec4(tint, envelope * (0.36 * wisps * front * breaks * (0.55 + observedLight) + haze * 0.75));
    #include <colorspace_fragment>
  }
`;

export function CrabPulsarWind({ paused, daysPerSecond, texture, scale }: { paused: boolean; daysPerSecond: number; texture?: Texture; scale: number }) {
  const material = useRef<ShaderMaterial>(null);
  const phase = useRef(0);
  const brightness = useRef(1);
  const uniforms = useMemo(
    () => ({
      phase: { value: 0 },
      observation: { value: texture ?? null },
      mapped: { value: texture !== undefined },
    }),
    [texture],
  );
  const rate = daysPerSecond >= 1 ? 1.1 + 0.27 * Math.log10(daysPerSecond) : 1.1 * Math.min(1, daysPerSecond * 86400);

  useFrame((_, delta) => {
    if (!paused) phase.current = (phase.current + Math.min(delta, 0.1) * rate) % (2 * Math.PI);
    if (material.current) material.current.uniforms.phase.value = phase.current;
    brightness.current = 0.68 + 0.24 * Math.pow(0.5 + 0.5 * Math.cos(phase.current * 4), 4);
  });

  return (
    <group scale={scale}>
      <group rotation={[0.58, 0.0, -0.32]}>
        <mesh rotation-x={-Math.PI / 2} raycast={() => {}}>
          <planeGeometry args={[7.5, 7.5, 36, 36]} />
          <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} side={DoubleSide} transparent depthWrite={false} blending={AdditiveBlending} />
        </mesh>
      </group>
      <mesh>
        <sphereGeometry args={[0.185, 32, 24]} />
        <meshBasicMaterial color="#f4faff" />
      </mesh>
      <StellarGlow radius={0.185} color="#b1d9ff" strength={0.9} brightness={brightness} />
    </group>
  );
}
