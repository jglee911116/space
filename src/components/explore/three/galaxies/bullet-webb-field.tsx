import { useMemo } from 'react';
import { CustomBlending, OneFactor, ZeroFactor, type Texture } from 'three';
import { bulletWebbSources } from '@/constants/space';

// Reference pixel, plate scale and rotation from the ESA/Webb JPEG's AVM metadata.
const referenceX = 5724.895 / 11235 * 4000;
const referenceY = (1 - 2576.102 / 4714) * 1678;
const radians = 16.32 * Math.PI / 180;
const sceneUnitsPerPixel = 8.67415e-6 * 11235 / 4000 * 73;
const westOrigin = (104.62 - 104.61441266) * 41;
const northOrigin = (55.95 - 55.94834987) * 73;

// Expand the presentation without changing the relative sky positions used for matching.
export const bulletDisplaySpread: [number, number, number] = [1.08, 1.20, 1.32];

export const webbSources = bulletWebbSources.map(([x, y, radius]) => {
  const right = (x - referenceX) * sceneUnitsPerPixel;
  const up = (referenceY - y) * sceneUnitsPerPixel;
  return {
    x: westOrigin + right * Math.cos(radians) - up * Math.sin(radians),
    y: northOrigin + right * Math.sin(radians) + up * Math.cos(radians),
    size: radius * sceneUnitsPerPixel,
  };
});

const vertex = /* glsl */ `
  attribute vec4 source;
  attribute float tile;
  varying vec2 atlasUv;
  void main() {
    vec4 center = modelViewMatrix * vec4(source.xyz, 1.0);
    vec2 offset = position.xy * source.w;
    float angle = 0.28484;
    center.xy += mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * offset;
    vec2 cell = vec2(mod(tile, 32.0), 15.0 - floor(tile / 32.0));
    atlasUv = (cell + 0.015625 + 0.96875 * uv) / vec2(32.0, 16.0);
    gl_Position = projectionMatrix * center;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D atlas;
  uniform float strength;
  varying vec2 atlasUv;
  void main() {
    vec3 light = texture2D(atlas, atlasUv).rgb;
    gl_FragColor = vec4(light * strength, 0.0);
    #include <colorspace_fragment>
  }
`;

const tiles = Float32Array.from(webbSources, (_, index) => index);
const positions = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
const uv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

export function BulletWebbField({ texture, depths, strength }: { texture: Texture; depths: readonly number[]; strength: number }) {
  const [spreadX, spreadY, spreadZ] = bulletDisplaySpread;
  const offsets = useMemo(() => Float32Array.from(
    webbSources.flatMap(({ x, y, size }, index) => [x * spreadX, y * spreadY, depths[index] * spreadZ, size]),
  ), [depths, spreadX, spreadY, spreadZ]);
  const uniforms = useMemo(() => ({ atlas: { value: texture }, strength: { value: strength } }), [texture, strength]);
  return (
    <mesh frustumCulled={false} raycast={() => {}}>
      <instancedBufferGeometry instanceCount={webbSources.length}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-uv" args={[uv, 2]} />
        <bufferAttribute attach="index" args={[indices, 1]} />
        <instancedBufferAttribute attach="attributes-source" args={[offsets, 4]} />
        <instancedBufferAttribute attach="attributes-tile" args={[tiles, 1]} />
      </instancedBufferGeometry>
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms}
        transparent depthWrite={false} blending={CustomBlending}
        blendSrc={OneFactor} blendDst={OneFactor} blendSrcAlpha={ZeroFactor} blendDstAlpha={OneFactor} />
    </mesh>
  );
}
