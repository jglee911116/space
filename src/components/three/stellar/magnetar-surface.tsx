import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, CatmullRomCurve3, Color, Vector3, type ShaderMaterial } from 'three';
import { spatialNoise, surfaceVertex } from '../shared/shaders';

const crust = /* glsl */ `
  varying vec3 surface;
  varying vec3 viewDirection;
  varying vec3 viewNormal;
  uniform float phase;
  ${spatialNoise}
  void main() {
    vec3 p = normalize(surface);
    float latitude = abs(p.y);
    float grain = noise(p * 37.0) * 0.31 + noise(p * 9.0) * 0.69;
    float cap = smoothstep(0.84, 0.994, latitude + (grain - 0.5) * 0.10);
    float facing = max(dot(normalize(viewNormal), normalize(viewDirection)), 0.0);
    float ridge = 1.0 - smoothstep(0.02, 0.17, abs(noise(p * 12.0) - 0.52));
    vec3 color = mix(vec3(0.057, 0.042, 0.105), vec3(0.28, 0.19, 0.45), grain);
    color += vec3(0.11, 0.042, 0.15) * ridge * (0.25 + grain);
    color *= 0.62 + 0.38 * sqrt(facing);
    color += vec3(0.20, 0.28, 0.64) * pow(1.0 - facing, 4.0) * 0.55;
    color = mix(color, vec3(1.0, 0.67, 0.42), cap * (0.66 + 0.19 * sin(phase)));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

const fieldVertex = /* glsl */ `
  varying float path;
  void main() {
    path = uv.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fieldFragment = /* glsl */ `
  varying float path;
  uniform float phase;
  uniform vec3 tint;
  void main() {
    float ends = smoothstep(0.02, 0.18, path) * (1.0 - smoothstep(0.82, 0.98, path));
    float pulse = pow(0.5 + 0.5 * cos(path * 21.0 - phase), 4.0);
    vec3 color = mix(tint, vec3(0.88, 0.89, 1.0), pulse * 0.45);
    gl_FragColor = vec4(color, ends * (0.07 + 0.25 * pulse));
    #include <colorspace_fragment>
  }
`;

export function MagnetarSurface({ color, paused }: { color: string; paused: boolean }) {
  const time = useRef(0);
  const materials = useRef<(ShaderMaterial | null)[]>([]);
  const uniforms = useMemo(() => ({ phase: { value: 0 }, tint: { value: new Color(color) } }), [color]);
  const field = useMemo(
    () =>
      [1.6, 2.22, 2.87].flatMap((shell, ring) =>
        Array.from({ length: 5 }, (_, index) => {
          const edge = Math.asin(Math.sqrt(1 / shell));
          return new CatmullRomCurve3(
            Array.from({ length: 37 }, (_, step) => {
              const theta = edge + (step / 36) * (Math.PI - 2 * edge);
              const longitude = (index * Math.PI * 2) / 5 + 0.21 * ring + 0.58 * Math.cos(theta);
              const radius = shell * Math.sin(theta) ** 2;
              return new Vector3(radius * Math.sin(theta) * Math.cos(longitude), radius * Math.cos(theta), radius * Math.sin(theta) * Math.sin(longitude));
            }),
          );
        }),
      ),
    [],
  );

  useFrame((_, delta) => {
    if (!paused) time.current = (time.current + Math.min(delta, 0.1) * 2.9) % (2 * Math.PI);
    for (const material of materials.current) {
      if (material) material.uniforms.phase.value = time.current;
    }
  });

  return (
    <>
      <mesh>
        <sphereGeometry args={[1, 64, 40]} />
        <shaderMaterial
          ref={(material) => {
            materials.current[0] = material;
          }}
          uniforms={uniforms}
          vertexShader={surfaceVertex}
          fragmentShader={crust}
        />
      </mesh>
      {field.map((curve, index) => (
        <mesh key={index} raycast={() => {}}>
          <tubeGeometry args={[curve, 48, index < 5 ? 0.012 : 0.007, 5, false]} />
          <shaderMaterial
            ref={(material) => {
              materials.current[index + 1] = material;
            }}
            uniforms={uniforms}
            vertexShader={fieldVertex}
            fragmentShader={fieldFragment}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </>
  );
}
