import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { AdditiveBlending, BackSide, Vector2, type Mesh, type ShaderMaterial, type Texture } from 'three';

const halfHeight = 0.19;

const vertex = /* glsl */ `
  varying vec3 boxPoint;
  varying vec3 localEye;

  void main() {
    boxPoint = position;
    localEye = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  varying vec3 boxPoint;
  varying vec3 localEye;
  uniform sampler2D diskMap;
  uniform vec2 center;
  uniform vec2 span;
  uniform vec2 basis;
  uniform float halfHeight;
  uniform float layerOpacity;

  void main() {
    vec3 ray = normalize(boxPoint - localEye);
    vec3 bound = vec3(1.0, halfHeight, 1.0);
    vec3 invRay = 1.0 / (ray + vec3(0.000001));
    vec3 a = (-bound - localEye) * invRay;
    vec3 b = (bound - localEye) * invRay;
    vec3 entry = min(a, b);
    vec3 exit = max(a, b);
    float start = max(0.0, max(entry.x, max(entry.y, entry.z)));
    float end = min(exit.x, min(exit.y, exit.z));
    if (end <= start) discard;

    const int steps = 40;
    float stepSize = (end - start) / float(steps);
    float jitter = 0.2 + 0.6 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    vec3 light = vec3(0.0);
    float transmission = 1.0;
    for (int i = 0; i < steps; ++i) {
      vec3 p = localEye + ray * (start + (float(i) + jitter) * stepSize);
      float radial = length(p.xz);
      if (radial >= 0.98) continue;

      vec2 samplePoint = vec2(p.x, -p.z) * span;
      vec2 uv = center + mat2(basis.x, basis.y, -basis.y, basis.x) * samplePoint;
      vec2 edgeDistance = min(uv, 1.0 - uv);
      float edge = min(edgeDistance.x, edgeDistance.y);
      if (edge <= 0.0) continue;
      vec3 image = texture2D(diskMap, uv).rgb;
      float brightness = max(image.r, max(image.g, image.b));
      float mask = (1.0 - smoothstep(0.72, 0.98, radial)) * smoothstep(0.0, 0.095, edge);

      // A thin stellar disk and a softer central bulge taper continuously above and below the midplane.
      float height = abs(p.y);
      float disk = exp(-height / (0.017 + 0.009 * radial));
      float core = exp(-radial * radial * 43.0);
      float bulge = exp(-height * height / 0.0055) * core * 0.59;
      float vertical = (disk + bulge) * (1.0 - smoothstep(0.12, halfHeight, height));
      float density = 17.0 * mask * vertical * smoothstep(0.008, 0.22, brightness);
      float opacity = 1.0 - exp(-stepSize * density);
      light += transmission * opacity * image;
      transmission *= 1.0 - opacity;
      if (transmission < 0.025) break;
    }

    float opacity = 1.0 - transmission;
    gl_FragColor = vec4(light / max(opacity, 0.001), opacity * 0.85 * layerOpacity);
    #include <colorspace_fragment>
  }
`;

type Props = {
  texture: Texture;
  radius: number;
  center: readonly [number, number];
  span: readonly [number, number];
  rotation?: number;
  opacity?: RefObject<number>;
};

export function GalaxyObservationDisk({ texture, radius, center, span, rotation = 0, opacity }: Props) {
  const mesh = useRef<Mesh<import('three').BufferGeometry, ShaderMaterial>>(null);
  const uniforms = useMemo(
    () => ({
      diskMap: { value: texture },
      center: { value: new Vector2(...center) },
      span: { value: new Vector2(...span) },
      halfHeight: { value: halfHeight },
      layerOpacity: { value: 1 },
      basis: { value: new Vector2(Math.cos(rotation), Math.sin(rotation)) },
    }),
    [texture, center, span, rotation],
  );

  useFrame(() => {
    if (!mesh.current || !opacity) return;
    mesh.current.visible = opacity.current > 0.005;
    mesh.current.material.uniforms.layerOpacity.value = opacity.current;
  });

  return (
    <mesh ref={mesh} scale={radius} raycast={() => {}}>
      <boxGeometry args={[2, 2 * halfHeight, 2]} />
      <shaderMaterial uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} side={BackSide} transparent depthWrite={false} blending={AdditiveBlending} />
    </mesh>
  );
}
