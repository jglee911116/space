import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, BackSide, Color, Vector2, Vector3, type Mesh, type ShaderMaterial, type Texture } from 'three';
import type { Galaxy } from '@/constants/space';
import { previewVisibility } from '../maps/map-detail';

const vertex = /* glsl */ `
  varying vec3 boxPoint;
  varying vec3 eye;

  void main() {
    boxPoint = position;
    eye = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  varying vec3 boxPoint;
  varying vec3 eye;
  uniform sampler2D diskMap;
  uniform bool mapped;
  uniform vec2 center;
  uniform vec2 span;
  uniform vec2 basis;
  uniform vec3 tint;
  uniform float pitch;
  uniform int shape;
  uniform bool barred;
  uniform float visibility;

  void main() {
    vec3 ray = normalize(boxPoint - eye);
    vec3 bound = vec3(1.0, 0.84, 1.0);
    vec3 invRay = 1.0 / (ray + vec3(0.000001));
    vec3 a = (-bound - eye) * invRay;
    vec3 b = (bound - eye) * invRay;
    vec3 entry = min(a, b);
    vec3 exit = max(a, b);
    float start = max(0.0, max(entry.x, max(entry.y, entry.z)));
    float end = min(exit.x, min(exit.y, exit.z));
    if (end <= start) discard;

    // Evaluate a smooth light profile at the closest point along the viewing ray.
    vec3 stretch = vec3(shape == 2 ? 3.9 : 1.0, shape == 2 ? 3.2 : 2.4, 1.25);
    vec3 coreRay = ray * stretch;
    float coreT = clamp(-dot(eye * stretch, coreRay) / dot(coreRay, coreRay), start, end);
    vec3 corePoint = (eye + ray * coreT) * stretch;
    float coreDistance = length(corePoint);
    float core = exp(-coreDistance * coreDistance * (shape == 2 ? 3.4 : 24.0)) * (1.0 - smoothstep(0.55, 0.98, coreDistance));

    float mid = (start + end) * 0.5;
    float plane = abs(ray.y) > 0.005 ? -eye.y / ray.y : mid;
    float diskT = mix(mid, clamp(plane, start, end), smoothstep(0.015, 0.12, abs(ray.y)));
    vec3 p = eye + ray * diskT;
    float radial = length(p.xz);
    float width = shape == 1 ? 0.12 : 0.066;
    float disk = exp(-abs(p.y) / width) * (1.0 - smoothstep(0.70, 0.98, radial));
    vec3 diskColor = tint;
    if (mapped) {
      vec2 uv = center + mat2(basis.x, basis.y, -basis.y, basis.x) * (vec2(p.x, -p.z) * span);
      vec3 image = texture2D(diskMap, clamp(uv, 0.0, 1.0)).rgb;
      vec2 border = min(uv, 1.0 - uv);
      float brightness = max(image.r, max(image.g, image.b));
      disk *= smoothstep(0.005, 0.22, brightness) * smoothstep(0.0, 0.09, min(border.x, border.y));
      diskColor = image;
      core *= 0.34;
    } else if (shape == 0) {
      float angle = atan(p.z, p.x + 0.00001);
      float spiral = cos(2.0 * (angle - pitch * log(max(0.08, radial))));
      disk *= (0.28 + 0.72 * smoothstep(-0.26, 0.96, spiral)) * (1.0 - radial * 0.56);
    } else {
      disk *= (shape == 2 ? 0.0 : 0.58) * (1.0 - radial);
    }

    if (barred && !mapped) {
      vec3 barPoint = p / vec3(0.38, 0.083, 0.096);
      core += exp(-dot(barPoint, barPoint) * 2.0) * 0.58;
    }
    vec3 coreColor = mix(tint, vec3(1.0, 0.77, 0.49), 0.65);
    float alpha = disk * 0.65 + core * 0.48;
    gl_FragColor = vec4((diskColor * disk * 0.65 + coreColor * core * 0.48) / max(alpha, 0.001), min(alpha, 0.83) * visibility);
    #include <colorspace_fragment>
  }
`;

export function GalaxyPreview({ galaxy, texture }: { galaxy: Galaxy; texture?: Texture }) {
  const { diskObservation, morphology, modelRadiusKpc } = galaxy;
  const mesh = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);
  const position = useMemo(() => new Vector3(), []);
  const uniforms = useMemo(() => {
    const rotation = diskObservation?.rotation ?? 0;
    const shape = morphology?.includes('elliptical') ? 2 : morphology?.includes('irregular') ? 1 : 0;
    return {
      diskMap: { value: texture ?? null },
      mapped: { value: texture !== undefined },
      center: { value: new Vector2(...(diskObservation?.center ?? [0.5, 0.5])) },
      span: { value: new Vector2(...(diskObservation?.span ?? [0.5, 0.5])) },
      basis: { value: new Vector2(Math.cos(rotation), Math.sin(rotation)) },
      tint: { value: new Color(galaxy.color) },
      pitch: { value: morphology === 'open-spiral' ? 1.65 : 2.5 },
      shape: { value: shape },
      barred: { value: morphology === 'barred-spiral' },
      visibility: { value: 0 },
    };
  }, [diskObservation, galaxy.color, morphology, texture]);

  useFrame(({ camera, size }) => {
    if (!mesh.current || !material.current) return;
    mesh.current.getWorldPosition(position).applyMatrix4(camera.matrixWorldInverse);
    const visibility = previewVisibility(modelRadiusKpc * 2, -position.z, camera, size.height);
    mesh.current.visible = visibility > 0;
    material.current.uniforms.visibility.value = visibility;
  });

  return (
    <mesh ref={mesh} scale={modelRadiusKpc} raycast={() => {}}>
      <boxGeometry args={[2, 1.68, 2]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} side={BackSide} transparent depthWrite={false} blending={AdditiveBlending} />
    </mesh>
  );
}
