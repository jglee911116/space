import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { MathUtils, Vector3, type Mesh, type ShaderMaterial } from 'three';
import { previewVisibility } from '../maps/map-detail';
import { STELLAR_DETAIL_EXIT, STELLAR_WIND_FADE, STELLAR_WIND_RADIUS } from './stellar-wind-density';

const vertex = /* glsl */ `
  varying vec2 offset;
  varying vec3 plume;

  void main() {
    offset = uv * 2.0 - 1.0;
    plume = mat3(viewMatrix) * normalize(vec3(-0.54, 0.80, 0.20));
    vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float diameter = length(modelViewMatrix[0].xyz);
    gl_Position = projectionMatrix * (center + vec4(position.xy * diameter, 0.0, 0.0));
  }
`;

const fragment = /* glsl */ `
  uniform bool warm;
  uniform bool detail;
  uniform float visibility;
  varying vec2 offset;
  varying vec3 plume;

  void main() {
    float r = length(offset);
    float rim = 1.0 / ${STELLAR_WIND_RADIUS.toFixed(1)};
    float limb = max(0.0, r - rim);
    float edge = 1.0 - smoothstep(0.60, 0.99, r);
    float corona = exp(-limb * (warm ? 7.0 : 5.8));
    vec2 direction = offset / max(r, 0.001);
    float alignment = dot(direction, plume.xy);
    float asymmetry = warm ? 0.64 + 0.86 * smoothstep(0.12, 0.91, alignment) : 0.82 + 0.18 * direction.x * direction.x;
    float halo = (warm ? 0.31 : 0.29) * corona * asymmetry * edge;
    halo *= smoothstep(rim - 0.044, rim + 0.035, r);
    float core = detail ? 0.0 : (1.0 - smoothstep(rim * 0.89, rim * 1.06, r));
    vec3 wind = warm ? vec3(0.88, 0.36, 0.17) : vec3(0.35, 0.59, 0.91);
    vec3 disk = warm ? vec3(0.98, 0.59, 0.32) : vec3(0.69, 0.82, 1.0);
    gl_FragColor = vec4(mix(wind, disk, core), min(1.0, core + halo) * visibility);
    #include <colorspace_fragment>
  }
`;

export function StellarWindHalo({ warm, overviewDistance }: { warm: boolean; overviewDistance?: number }) {
  const mesh = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);
  const position = useMemo(() => new Vector3(), []);
  const detail = overviewDistance === undefined;
  const diameter = 2 * STELLAR_WIND_RADIUS * (detail ? 1 : overviewDistance / STELLAR_DETAIL_EXIT);
  const uniforms = useMemo(
    () => ({
      warm: { value: warm },
      detail: { value: detail },
      visibility: { value: 0 },
    }),
    [warm, detail],
  );
  useFrame(({ camera, size }) => {
    if (!mesh.current || !material.current) return;
    mesh.current.getWorldPosition(position);
    const alpha = detail
      ? MathUtils.smoothstep(position.distanceTo(camera.position), ...STELLAR_WIND_FADE)
      : previewVisibility(diameter, -position.applyMatrix4(camera.matrixWorldInverse).z, camera, size.height);
    mesh.current.visible = alpha > 0;
    material.current.uniforms.visibility.value = alpha;
  });
  return (
    <mesh ref={mesh} scale={diameter} frustumCulled={false} raycast={() => {}}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} />
    </mesh>
  );
}
