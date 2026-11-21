import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { BackSide, type ShaderMaterial } from 'three';
import { spatialNoise } from '../shared/shaders';
import { CYGNUS_DISK_RATE } from './accretion-model';

const vertex = /* glsl */ `
  varying vec3 localEye;
  varying vec3 boxPoint;

  void main() {
    localEye = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
    boxPoint = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float time;
  uniform float diskPhase;
  varying vec3 localEye;
  varying vec3 boxPoint;
  ${spatialNoise}

  const vec3 donor = vec3(0.44, 0.0, 0.0);
  const vec3 hole = vec3(-0.31, 0.0, 0.0);
  const float donorRadius = 0.19;
  const float shadowRadius = 0.73 * 0.081;
  const vec3 diskX = vec3(0.971338, -0.237703, 0.0);
  const vec3 diskNormal = vec3(0.237703, 0.971338, 0.0);

  float stellarWind(vec3 p) {
    vec3 q = (p - donor) * vec3(0.86, 1.08, 1.13);
    float r = length(q);
    if (r >= 0.53 || length(p - donor) <= donorRadius) return 0.0;
    vec3 direction = q / max(r, 0.001);
    float limb = max(0.0, r - 0.18);
    float warp = noise(direction * 5.0 + vec3(2.0, 0.0, 7.0));
    float pulse = 0.5 + 0.5 * cos(58.0 * limb - 2.8 * time + 4.7 * warp);
    float wisps = noise(direction * 9.0 + vec3(limb * 5.0 - time * 0.22, 0.0, 0.0));
    float clumps = noise(q * 29.0 - direction * time * 0.27);
    return (0.28 + 0.72 * pulse * pulse) * smoothstep(0.15, 0.83, wisps * 0.63 + clumps * 0.37) *
      exp(-5.4 * limb) * (1.0 - smoothstep(0.40, 0.53, r)) * (0.65 + 0.35 * direction.x) * 5.2;
  }

  vec4 accretingGas(vec3 p) {
    float progress = clamp((0.35 - p.x) / 0.54, 0.0, 1.0);
    float width = mix(0.067, 0.041, progress) + 0.056 * sin(progress * 3.14159);
    vec2 wakeCenter = vec2(0.037 * sin(progress * 2.6), 0.052 * sin(progress * 2.1));
    vec2 wakeOffset = (p.yz - wakeCenter) / vec2(width * 0.71, width);
    float wakeDistance = dot(wakeOffset, wakeOffset);
    float focusedGas = 0.58 * smoothstep(0.23, 0.88, progress) * exp(-2.5 * wakeDistance);
    float wake = (exp(-wakeDistance) + focusedGas) *
      smoothstep(-0.26, -0.09, p.x) * (1.0 - smoothstep(0.35, 0.51, p.x));
    float stream = 0.0;
    vec3 delta = p - hole;
    vec2 inPlane = vec2(dot(delta, diskX), -delta.z);
    float r = length(inPlane);
    if (r < 0.28 && r > 0.024 && abs(dot(delta, diskNormal)) < 0.19) {
      // The trailing arm is fixed to the wind inlet. Density moves along it in the disk's direction.
      float angle = atan(inPlane.y, inPlane.x);
      float winding = angle + 3.65 * log(r / 0.22) + 0.22;
      float arm = 0.5 + 0.5 * cos(winding);
      float height = mix(0.016, 0.066, smoothstep(shadowRadius, 0.21, r));
      float h = (dot(delta, diskNormal) - height) / mix(0.018, 0.047, smoothstep(0.055, 0.24, r));
      float flow = 0.66 + 0.34 * noise(vec3(cos(angle - diskPhase), sin(angle - diskPhase), r * 17.0) * 2.4);
      stream = (0.10 + 1.23 * arm * arm) * exp(-h * h) * flow *
        (1.0 - smoothstep(0.20, 0.28, r)) * smoothstep(0.029, shadowRadius, length(delta));
    }
    float total = wake + stream;
    if (total < 0.005) return vec4(0.0);
    float coarse = noise(p * 13.0 + vec3(time * 1.6, 0.0, 0.0));
    float detail = noise(p * 39.0 + vec3(time * 4.2, 0.0, 0.0));
    float turbulence = smoothstep(0.20, 0.83, 0.68 * coarse + 0.32 * detail);
    float warmed = smoothstep(0.15, 0.88, progress);
    vec3 blue = vec3(0.10, 0.36, 0.78);
    vec3 warm = vec3(0.75, 0.32, 0.14);
    vec3 color = (mix(blue, warm, warmed) * wake + vec3(1.0, 0.55, 0.28) * stream) / total;
    return vec4(color, total * (0.23 + 0.77 * turbulence) * 3.8);
  }

  float opaqueSurface(vec3 ray, vec3 center, float radius, float limit) {
    vec3 offset = localEye - center;
    float b = dot(offset, ray);
    float discriminant = b * b - dot(offset, offset) + radius * radius;
    if (discriminant <= 0.0) return limit;
    float entry = -b - sqrt(discriminant);
    return entry >= 0.0 ? min(limit, entry) : limit;
  }

  void main() {
    vec3 ray = normalize(boxPoint - localEye);
    vec3 reciprocal = 1.0 / (ray + vec3(0.000001));
    vec3 bounds = vec3(1.16, 0.56, 0.56);
    vec3 a = (-bounds - localEye) * reciprocal;
    vec3 b = (bounds - localEye) * reciprocal;
    vec3 entry = min(a, b);
    float start = max(0.0, max(entry.x, max(entry.y, entry.z)));
    float end = opaqueSurface(ray, donor, donorRadius, length(boxPoint - localEye));
    end = opaqueSurface(ray, hole, shadowRadius, end);
    if (end <= start) discard;

    const int samples = 48;
    float stepSize = (end - start) / float(samples);
    vec3 accumulated = vec3(0.0);
    float remaining = 1.0;
    for (int i = 0; i < samples; ++i) {
      vec3 p = localEye + ray * (start + (float(i) + 0.5) * stepSize);
      float wind = stellarWind(p);
      vec4 gas = accretingGas(p);
      float density = wind + gas.a;
      float opacity = 1.0 - exp(-density * stepSize);
      vec3 light = (vec3(0.10, 0.33, 0.78) * wind + gas.rgb * gas.a) / max(density, 0.0001);
      accumulated += remaining * opacity * light;
      remaining *= 1.0 - opacity;
    }
    float opacity = 1.0 - remaining;
    if (opacity < 0.004) discard;
    gl_FragColor = vec4(accumulated / opacity, opacity);
    #include <colorspace_fragment>
  }
`;

export function CygnusGas({ time }: { time: RefObject<number> }) {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 0 }, diskPhase: { value: 0 } }), []);
  useFrame(() => {
    if (!material.current) return;
    material.current.uniforms.time.value = time.current;
    material.current.uniforms.diskPhase.value = (time.current * CYGNUS_DISK_RATE) % (2 * Math.PI);
  });
  return (
    <mesh renderOrder={1} raycast={() => {}}>
      <boxGeometry args={[2.32, 1.12, 1.12]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} side={BackSide} transparent depthWrite={false} depthTest={false} />
    </mesh>
  );
}
