import { useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { AdditiveBlending, Color, type Vector3 } from 'three';
import { PREVIEW_HIDDEN_PX, PREVIEW_OPAQUE_PX } from './map-detail';

// The map's nominal preview sizes were chosen for a 900 px viewport at 45°.
const referenceFocalLength = 450 / Math.tan(Math.PI / 8);

const styles = {
  spiral: { form: 0, size: 46 },
  elliptical: { form: 1, size: 36 },
  cluster: { form: 2, size: 53 },
  quasar: { form: 3, size: 30 },
  jet: { form: 4, size: 51 },
  irregular: { form: 5, size: 42 },
  ring: { form: 6, size: 49 },
} as const;

export type CosmicMapMarker = {
  position: Vector3;
  color: string;
  style: keyof typeof styles;
};

const vertex = /* glsl */ `
  uniform float pixelRatio;
  uniform float viewportHeight;
  attribute vec3 tint;
  attribute vec3 appearance;
  varying vec3 objectColor;
  varying vec2 objectStyle;
  varying float visibility;

  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    objectColor = tint;
    objectStyle = appearance.xz;
    float diameter = appearance.y * projectionMatrix[1][1] * viewportHeight / (2.0 * max(-view.z, 0.001));
    visibility = smoothstep(float(${PREVIEW_HIDDEN_PX}), float(${PREVIEW_OPAQUE_PX}), diameter);
    gl_PointSize = min(63.0, diameter * pixelRatio);
    gl_Position = projectionMatrix * view;
  }
`;

const fragment = /* glsl */ `
  varying vec3 objectColor;
  varying vec2 objectStyle;
  varying float visibility;

  float hash(vec2 seed) {
    vec3 p = fract(vec3(seed.xyx) * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float gaussian(float value) {
    return exp(-value * value);
  }

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float c = cos(objectStyle.y);
    float s = sin(objectStyle.y);
    vec2 p = mat2(c, s, -s, c) * uv;
    float radius = length(p);
    float fade = 1.0 - smoothstep(0.66, 1.0, radius);
    if (fade <= 0.0 || visibility <= 0.0) discard;

    float form = objectStyle.x;
    float body = 0.0;
    float core = 0.0;
    if (form < 1.5) {
      vec2 disk = p * vec2(1.05, form < 0.5 ? 1.6 : 1.33);
      float r = length(disk);
      core = gaussian(r / 0.20) * 0.94;
      body = gaussian(r / 0.57) * 0.30;
      if (form < 0.5) {
        float angle = atan(disk.y, disk.x + 0.00001);
        float arms = 0.5 + 0.5 * cos(2.0 * angle - 6.05 * log(max(0.13, r)));
        body += pow(arms, 3.8) * gaussian(r / 0.78) * smoothstep(0.09, 0.37, r) * 0.67;
      }
    } else if (form < 2.5) {
      vec2 cell = p * 5.7;
      float first = hash(floor(cell));
      float second = hash(floor(cell) + 3.2);
      vec2 nucleus = fract(cell) - (0.23 + 0.54 * vec2(first, second));
      float galaxy = gaussian(length(nucleus * vec2(0.88, 1.40)) / (0.09 + 0.15 * first));
      core = galaxy * (0.26 + second * 0.67) * gaussian(radius / 0.66);
      body = gaussian(length(p * vec2(0.98, 1.18)) / 0.52) * 0.29;
    } else if (form < 4.5) {
      core = gaussian(radius / 0.125);
      body = gaussian(radius / 0.42) * 0.33;
      if (form > 3.5) {
        float spread = 0.055 + 0.053 * abs(p.y);
        body += gaussian((p.x - 0.07 * p.y * abs(p.y)) / spread) * gaussian(p.y / 0.72) * 0.82;
      }
    } else if (form < 5.5) {
      core = gaussian(length(p - vec2(0.09, 0.06)) / 0.22) * 0.67;
      body = gaussian(length((p + vec2(0.25, 0.12)) * vec2(1.18, 1.6)) / 0.53) * 0.43;
      body += gaussian(length(p - vec2(0.32, -0.14)) / 0.29) * 0.55;
    } else {
      float disk = length(p * vec2(1.0, 1.34));
      core = gaussian(disk / 0.16) * 0.81;
      body = 0.86 * gaussian((disk - 0.62) / 0.095) + 0.42 * gaussian((disk - 0.25) / 0.067);
    }

    vec3 color = mix(objectColor, vec3(1.0, 0.91, 0.83), core * 0.76);
    gl_FragColor = vec4(color, min(1.0, body + core) * fade * visibility);
    #include <colorspace_fragment>
  }
`;

export function CosmicMapMarkers({ markers, referenceDepth }: { markers: readonly CosmicMapMarker[]; referenceDepth: number }) {
  const dpr = useThree((state) => state.viewport.dpr);
  const height = useThree((state) => state.size.height);
  const data = useMemo(() => {
    const positions = new Float32Array(markers.length * 3);
    const colors = new Float32Array(markers.length * 3);
    const appearances = new Float32Array(markers.length * 3);
    const tint = new Color();
    markers.forEach((marker, index) => {
      const offset = index * 3;
      marker.position.toArray(positions, offset);
      tint.set(marker.color).toArray(colors, offset);
      const { form, size } = styles[marker.style];
      appearances.set([form, size * referenceDepth / referenceFocalLength, ((index * 0.618) % 1) * Math.PI - 0.6], offset);
    });
    return { positions, colors, appearances };
  }, [markers, referenceDepth]);
  const uniforms = useMemo(() => ({ pixelRatio: { value: dpr }, viewportHeight: { value: height } }), [dpr, height]);

  return (
    <points frustumCulled={false} raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-tint" args={[data.colors, 3]} />
        <bufferAttribute attach="attributes-appearance" args={[data.appearances, 3]} />
      </bufferGeometry>
      <shaderMaterial uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  );
}
