import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BackSide, Color, Vector3, Vector4, type Mesh, type ShaderMaterial } from 'three';
import type { Galaxy } from '@/constants/space';
import { galaxyStructure } from './galaxy-structure';
import { previewVisibility } from '../maps/map-detail';
import { spatialNoise } from '../shared/shaders';

const vertex = /* glsl */ `
  varying vec3 boxPoint;
  varying vec3 localEye;
  varying float viewZ;

  void main() {
    boxPoint = position;
    localEye = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    viewZ = view.z;
    gl_Position = projectionMatrix * view;
  }
`;

function fragment(compact: boolean) {
  return /* glsl */ `
  varying vec3 boxPoint;
  varying vec3 localEye;
  varying float viewZ;
  uniform mat4 projectionMatrix;
  uniform int shape;
  uniform vec4 form;
  uniform vec4 structure;
  uniform vec3 features;
  uniform vec3 tint;
  uniform float visibility;
  ${spatialNoise}

  void sampleGalaxy(vec3 p, out vec3 light, out float density) {
    float axis = form.x;
    float thickness = form.y;
    float coreRadius = form.z;
    float asymmetry = form.w;
    float phase = features.z;
    float dustStrength = structure.w;
    vec3 warm = vec3(0.97, 0.65, 0.36);
    if (shape == 2) {
      float r = length(p / vec3(1.0, thickness, axis));
      float envelope = 1.0 - smoothstep(0.66, 1.15, r);
      float nucleus = exp(-r * 2.1 / coreRadius);
      float halo = exp(-r * 4.5) * envelope;
      float stars = 18.0 * nucleus + 4.5 * halo;
      float dust = 0.0;
      if (dustStrength > 0.0) {
        float bend = 0.16 * p.x + 0.11 * sin(3.4 * p.z + 1.8 * p.x);
        float lane = exp(-abs(p.y - bend) / 0.049);
        float detail = noise(p * vec3(16.0, 26.0, 13.0));
        dust = dustStrength * 31.0 * lane * (0.16 + 0.84 * detail * detail)
          * (1.0 - smoothstep(0.42, 0.92, length(p.xz)));
      }
      density = stars + dust;
      light = mix(tint, warm, 0.26 + 0.47 * nucleus) * stars * 1.12;
      return;
    }

    vec2 plane = p.xz / vec2(1.0, axis);
    float angle = atan(plane.y, plane.x + 0.00001);
    float warp = asymmetry * (0.36 * cos(angle - phase) + 0.18 * sin(3.0 * angle + phase));
    float r = length(plane) / (1.0 + warp);
    float outer = 1.0 - smoothstep(0.63, 1.02, r);
    float midplane = 0.07 * asymmetry * r * sin(3.0 * angle + phase);
    float height = abs(p.y - midplane);
    float disk = exp(-r * 2.45 - height / thickness) * outer;
    float nucleus = exp(-length(vec3(plane, p.y * 1.75)) * 1.8 / coreRadius);
    float stars = 12.0 * nucleus;
    float gas = 0.0;
    float dust = 0.0;
    float clouds = noise(vec3(plane * 14.0, p.y * 17.0) + phase);
    float coarse = noise(vec3(plane * 5.0, p.y * 6.5) - phase);
    if (shape == 1) {
      float knotDensity = smoothstep(0.25, 0.75, coarse * 0.73 + clouds * 0.27);
      stars += disk * (0.5 + 6.2 * knotDensity);
      gas = disk * 5.0 * smoothstep(0.49, 0.78, clouds * 0.77 + coarse * 0.23);
      dust = dustStrength * disk * 4.0 * smoothstep(0.39, 0.68, 1.0 - clouds);
    } else {
      float armPhase = structure.x * (angle - structure.y * log(max(0.11, r) / max(structure.z, 0.11))
        - (structure.z > 0.0 ? 0.0 : phase)) + (coarse - 0.5) * 0.85;
      float arms = structure.x > 0.0 ? smoothstep(0.08, 0.97, cos(armPhase)) : 0.0;
      float startArm = smoothstep(0.11, max(structure.z, 0.13) + 0.08, r);
      arms *= startArm;
      float ring = features.x > 0.0 ? exp(-pow((r - features.x) / 0.046, 2.0)) : 0.0;
      stars += disk * (2.1 + 10.2 * arms + 6.0 * ring);
      gas = disk * (8.3 * arms + 5.3 * ring) * smoothstep(0.39, 0.78, clouds);
      float lane = structure.x > 0.0 ? smoothstep(0.48, 0.98, cos(armPhase - 0.72)) * startArm : 0.60;
      dust = dustStrength * 24.0 * exp(-r * 2.1 - height / (thickness * 0.48)) * outer
        * (0.18 + 0.82 * clouds) * (0.16 + lane);
    }

    if (structure.z > 0.0) {
      vec3 bar = p / vec3(structure.z, thickness * 0.85, 0.082);
      stars += 7.8 * exp(-dot(bar, bar) * 1.75);
    }
    float wind = 0.0;
    if (features.y > 0.0) {
      float h = abs(p.y);
      float spread = 0.09 + 0.44 * h;
      float wall = length(p.xz - vec2(0.12 * p.y, 0.07 * p.y)) - spread;
      float thread = noise(p * vec3(28.0, 8.0, 28.0) + phase);
      wind = features.y * 4.3 * exp(-abs(wall) / (0.033 + 0.025 * h))
        * smoothstep(0.035, 0.20, h) * (1.0 - smoothstep(0.34, 0.77, h)) * thread * thread;
    }
    vec3 young = mix(vec3(0.39, 0.55, 0.95), vec3(0.95, 0.25, 0.41), smoothstep(0.53, 0.83, coarse));
    density = stars + gas + dust + wind;
    light = stars * mix(tint, warm, 0.12 + 0.67 * nucleus)
      + gas * young * 1.55 + wind * vec3(0.96, 0.11, 0.17) * 2.1;
  }

  void main() {
    vec3 ray = normalize(boxPoint - localEye);
    float verticalBound = shape == 2 ? form.y * 1.15 : max(form.y * 3.8, form.z * 1.25);
    if (features.y > 0.0) verticalBound = 0.78;
    vec3 bound = vec3(1.3, verticalBound, 1.3);
    vec3 inverseRay = 1.0 / (ray + vec3(0.000001));
    vec3 a = (-bound - localEye) * inverseRay;
    vec3 b = (bound - localEye) * inverseRay;
    vec3 nearFace = min(a, b);
    vec3 farFace = max(a, b);
    float start = max(0.0, max(nearFace.x, max(nearFace.y, nearFace.z)));
    float end = min(farFace.x, min(farFace.y, farFace.z));
    if (end <= start) discard;
    const int count = ${compact ? 11 : 30};
    float stride = (end - start) / float(count);
    vec3 radiance = vec3(0.0);
    float transmission = 1.0;
    float front = end;
    float offset = mix(0.27, 0.73, fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))));
    for (int i = 0; i < count; ++i) {
      float t = start + (float(i) + offset) * stride;
      vec3 light;
      float density;
      sampleGalaxy(localEye + ray * t, light, density);
      float alpha = 1.0 - exp(-density * stride);
      radiance += transmission * alpha * light / max(density, 0.0001);
      transmission *= 1.0 - alpha;
      if (front == end && transmission < 0.93) front = t;
      if (transmission < 0.02) break;
    }
    float alpha = 1.0 - transmission;
    if (alpha * visibility < 0.007) discard;
    vec4 clip = projectionMatrix * vec4(0.0, 0.0, viewZ * front / length(boxPoint - localEye), 1.0);
    gl_FragDepth = clamp(0.5 + 0.5 * clip.z / clip.w, 0.0, 1.0);
    gl_FragColor = vec4(radiance / alpha, alpha * visibility * 0.91);
    #include <colorspace_fragment>
  }
  `;
}

export function ProceduralGalaxy({ galaxy, compact }: { galaxy: Galaxy; compact: boolean }) {
  const mesh = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);
  const position = useMemo(() => new Vector3(), []);
  const shader = useMemo(() => fragment(compact), [compact]);
  const uniforms = useMemo(() => {
    const model = galaxyStructure(galaxy);
    return {
      shape: { value: model.shape === 'elliptical' ? 2 : model.shape === 'irregular' ? 1 : 0 },
      form: { value: new Vector4(model.axis, model.thickness, model.core, model.asymmetry) },
      structure: { value: new Vector4(model.arms, model.winding, model.bar, model.dust) },
      features: { value: new Vector3(model.ring, model.wind, model.phase) },
      tint: { value: new Color(galaxy.color) },
      visibility: { value: compact ? 0 : 1 },
    };
  }, [galaxy, compact]);

  useFrame(({ camera, size }) => {
    if (!compact || !mesh.current || !material.current) return;
    mesh.current.getWorldPosition(position).applyMatrix4(camera.matrixWorldInverse);
    const opacity = previewVisibility(galaxy.modelRadiusKpc * 2, -position.z, camera, size.height);
    mesh.current.visible = opacity > 0;
    material.current.uniforms.visibility.value = opacity;
  });

  return (
    <mesh ref={mesh} scale={galaxy.modelRadiusKpc} raycast={() => {}}>
      <boxGeometry args={[2.6, 2.2, 2.6]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={shader} side={BackSide} transparent depthWrite={false} />
    </mesh>
  );
}
