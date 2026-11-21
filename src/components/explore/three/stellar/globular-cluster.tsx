import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, Vector3, type Points, type ShaderMaterial } from 'three';
import { pointBudget, previewOpacity, projectedPreviewDiameter } from '../maps/map-detail';

const vertex = /* glsl */ `
  attribute float grain;
  uniform float viewport;
  varying vec3 starColor;
  varying float intensity;

  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    float radius = length(modelViewMatrix[0].xyz);
    float projected = radius * viewport * projectionMatrix[1][1] / max(0.001, -view.z);
    gl_Position = projectionMatrix * view;
    gl_PointSize = clamp(0.9 + grain * grain * (1.1 + 0.013 * projected), 1.0, 8.0);
    starColor = color;
    intensity = mix(0.30, 0.91, grain * grain);
  }
`;

const fragment = /* glsl */ `
  uniform float visibility;
  varying vec3 starColor;
  varying float intensity;
  void main() {
    float r = length(gl_PointCoord * 2.0 - 1.0);
    float light = exp(-4.0 * r * r) * (1.0 - smoothstep(0.55, 1.0, r));
    gl_FragColor = vec4(starColor, light * intensity * visibility);
    #include <colorspace_fragment>
  }
`;

type ClusterProfile = 'standard' | 'omega-centauri' | '47-tucanae';

function sampleStars(count: number, profile: ClusterProfile) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const grains = new Float32Array(count);
  const tucanae = profile === '47-tucanae';
  const omega = profile === 'omega-centauri';
  const palette = (tucanae ? ['#d9e5ff', '#fff1db', '#ffe6bd', '#f1a877'] : ['#d6e6ff', '#ffebd8', '#ffc483', '#e7b0aa']).map((color) => new Color(color));
  let seed = tucanae ? 104 : omega ? 5139 : 136205;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let index = 0; index < count; index++) {
    const radius = random() ** (tucanae ? 2.7 : omega ? 2.55 : 2.15);
    const y = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const horizontal = radius * Math.sqrt(1 - y * y);
    positions.set([horizontal * Math.cos(angle), y * radius * (omega ? 0.88 : 0.94), horizontal * Math.sin(angle)], index * 3);
    palette[Math.floor(random() * palette.length)].toArray(colors, index * 3);
    grains[index] = random();
  }
  return { positions, colors, grains };
}

export function GlobularCluster({ radius, preview = false, objectId }: { radius: number; preview?: boolean; objectId?: string }) {
  const points = useRef<Points>(null);
  const material = useRef<ShaderMaterial>(null);
  const center = useMemo(() => new Vector3(), []);
  const profile = objectId === 'ngc-104' ? '47-tucanae' : objectId === 'ngc-5139' ? 'omega-centauri' : 'standard';
  const count = preview ? 3600 : profile === 'standard' ? 16000 : 26000;
  const model = useMemo(() => sampleStars(count, profile), [count, profile]);
  const uniforms = useMemo(() => ({ viewport: { value: 1 }, visibility: { value: preview ? 0 : 1 } }), [preview]);
  useFrame(({ camera, size, gl }) => {
    if (!points.current || !material.current) return;
    material.current.uniforms.viewport.value = size.height * gl.getPixelRatio() * 0.5;
    if (!preview) return;
    points.current.getWorldPosition(center).applyMatrix4(camera.matrixWorldInverse);
    const pixels = projectedPreviewDiameter(radius * 2, -center.z, camera, size.height);
    const opacity = previewOpacity(pixels);
    points.current.visible = opacity > 0;
    material.current.uniforms.visibility.value = opacity;
    if (opacity > 0) {
      const visibleStars = pointBudget(count, pixels);
      if (points.current.geometry.drawRange.count !== visibleStars) points.current.geometry.setDrawRange(0, visibleStars);
    }
  });
  return (
    <points ref={points} scale={radius} raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[model.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[model.colors, 3]} />
        <bufferAttribute attach="attributes-grain" args={[model.grains, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} vertexColors blending={AdditiveBlending} depthWrite={false} transparent />
    </points>
  );
}
