import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Mesh, ShaderMaterial, Texture } from 'three';
import { REALTIME_DAYS_PER_SECOND } from '../utils/orbit';
import { blackHoleBillboardVertex } from './black-hole-lensing';
import { previewVisibility } from './map-detail';

const fragmentShader = /* glsl */ `
  uniform float phase;
  uniform float visibility;
  uniform bool showFlares;
  uniform sampler2D observationMap;
  uniform bool hasObservation;
  varying vec2 screenPoint;

  float gaussian(float x) {
    return exp(-x * x);
  }

  float noiseHash(vec2 cell) {
    return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(noiseHash(cell), noiseHash(cell + vec2(1.0, 0.0)), f.x),
      mix(noiseHash(cell + vec2(0.0, 1.0)), noiseHash(cell + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float plasma(float radius, float angle) {
    vec2 streamline = vec2(cos(angle), sin(angle)) * (4.0 + 23.0 * radius);
    float broad = noise(streamline + vec2(5.1, 16.4));
    float fine = noise(streamline * 2.7 + 1.6 * broad);
    float detail = noise(streamline * 6.9);
    float density = 0.56 * broad + 0.30 * fine + 0.14 * detail;
    return smoothstep(0.19, 0.91, density);
  }

  vec2 flare(vec2 disk, float angle, float strength, float height) {
    vec2 radial = vec2(cos(angle), sin(angle));
    vec2 tangent = vec2(-radial.y, radial.x);
    vec2 delta = disk - radial * 0.48;
    vec2 p = vec2(dot(delta, tangent), dot(delta, radial));
    vec2 arch = vec2(p.x / 0.061, p.y / height);
    float filament = gaussian((length(arch) - 1.0) / 0.091) * smoothstep(-0.05, 0.10, arch.y);
    float glow = gaussian((length(arch) - 1.0) / 0.29) * smoothstep(-0.05, 0.18, arch.y);
    vec2 foot = vec2((abs(p.x) - 0.052) / 0.032, p.y / 0.025);
    return strength * vec2(gaussian(length(foot)), filament * 0.78 + glow * 0.27);
  }

  void main() {
    vec2 p = screenPoint;
    float r = length(p);
    float shadow = 1.0 - smoothstep(0.30, 0.385, r);

    // Use one projected plane. The apparent distortion is gentler near the shadow.
    vec2 tilted = mat2(0.966, 0.259, -0.259, 0.966) * p;
    float flattening = mix(1.12, 1.56, smoothstep(0.39, 0.78, r));
    vec2 disk = vec2(tilted.x, tilted.y * flattening);
    float diskRadius = length(disk);
    float azimuth = atan(disk.y, disk.x);
    float streamline = azimuth + 4.4 * log(max(diskRadius, 0.24));
    float radialBlend = smoothstep(0.44, 0.68, diskRadius);
    float inner = plasma(diskRadius, streamline - 3.0 * phase);
    float outer = plasma(diskRadius, streamline - phase);
    float density = mix(inner, outer, radialBlend);
    float approach = 0.76 + 0.24 * cos(azimuth + 1.60);
    float rim = 0.458 + 0.017 * (density - 0.5);
    float ring = gaussian((diskRadius - rim) / 0.052) * approach * (0.22 + 0.92 * density);
    float filaments = pow(0.5 + 0.5 * sin(diskRadius * 52.0 - 3.0 * streamline + 6.0 * density), 2.0);
    float flow = gaussian((diskRadius - 0.55) / 0.24) * approach * (0.045 + density * (0.24 + 0.16 * filaments));
    float hotClumps = smoothstep(0.46, 0.89, density);
    float warmBands = gaussian((diskRadius - 0.61) / 0.19) * (0.07 + 0.32 * hotClumps) * approach;

    vec3 observed = vec3(0.0);
    if (hasObservation) {
      vec3 sampleColor = texture2D(observationMap, disk * 0.44 + 0.5).rgb;
      float ringMask = smoothstep(0.32, 0.43, diskRadius) * (1.0 - smoothstep(0.53, 0.69, diskRadius));
      observed = sampleColor * ringMask;
    }

    float observedLight = dot(observed, vec3(0.2126, 0.7152, 0.0722));
    float emission = ring * (0.84 + 0.30 * observedLight) + flow + warmBands;
    vec3 glow = mix(vec3(0.18, 0.019, 0.006), vec3(1.0, 0.29, 0.049), smoothstep(0.0, 0.60, emission));
    glow = mix(glow, vec3(1.0, 0.84, 0.60), smoothstep(0.46, 1.14, emission));
    vec2 flares = vec2(0.0);
    if (showFlares) {
      // Short pulses trace the visualized hotspots as they travel around the inner disk.
      float flashA = 0.18 + 0.82 * pow(0.5 + 0.5 * cos(phase * 3.0 + 0.3), 9.0);
      float flashB = 0.12 + 0.88 * pow(0.5 + 0.5 * cos(phase * 5.0 - 1.5), 8.0);
      float flashC = 0.10 + 0.90 * pow(0.5 + 0.5 * cos(phase * 4.0 + 2.4), 10.0);
      flares = flare(disk, phase - 2.56, flashA, 0.16);
      flares += flare(disk, phase - 0.15, flashB, 0.13);
      flares += flare(disk, phase + 1.82, flashC, 0.12);
    }
    glow += vec3(1.0, 0.71, 0.42) * flares.x * 0.83;
    glow = mix(glow, vec3(0.37, 0.55, 1.0), clamp(flares.y * 0.92, 0.0, 1.0));
    vec3 color = (glow + observed * 0.27) * (1.0 - shadow);
    float alpha = clamp(shadow + 1.48 * emission + 0.15 * observedLight + flares.x * 0.42 + flares.y * 0.66, 0.0, 1.0) * (1.0 - smoothstep(0.82, 1.0, r));
    gl_FragColor = vec4(color, alpha * visibility);
    #include <colorspace_fragment>
  }
`;

export const SAGITTARIUS_FLOW_DIAMETER = 6.3;

export function SagittariusAccretionFlow({ observationMap, paused, daysPerSecond, overviewDiameter }: { observationMap?: Texture; paused: boolean; daysPerSecond: number; overviewDiameter?: number }) {
  const phase = useRef(0);
  const material = useRef<ShaderMaterial>(null);
  const mesh = useRef<Mesh>(null);
  const shadow = useRef<Mesh>(null);
  const diameter = overviewDiameter ?? SAGITTARIUS_FLOW_DIAMETER;
  const speed = Math.max(0.18, 1 + 0.32 * Math.log10(daysPerSecond / REALTIME_DAYS_PER_SECOND));
  const uniforms = useMemo(() => ({
    phase: { value: 0 },
    visibility: { value: 1 },
    showFlares: { value: overviewDiameter === undefined },
    observationMap: { value: observationMap ?? null },
    hasObservation: { value: observationMap !== undefined },
  }), [observationMap, overviewDiameter]);

  useFrame(({ camera, size }, delta) => {
    if (!paused) {
      // Compress the explorer's wide speed range into readable motion at black-hole scale.
      phase.current = (phase.current + Math.min(delta, 0.1) * speed * 0.38) % (2 * Math.PI);
    }
    if (!mesh.current || !material.current) return;

    const visibility = overviewDiameter === undefined ? 1 : previewVisibility(diameter, -camera.matrixWorldInverse.elements[14], camera, size.height);
    mesh.current.visible = visibility > 0;
    if (shadow.current) shadow.current.visible = visibility === 1;
    material.current.uniforms.phase.value = phase.current;
    material.current.uniforms.visibility.value = visibility;
  });

  return (
    <>
      <mesh ref={shadow} scale={diameter} raycast={() => {}}>
        <sphereGeometry args={[0.15, 32, 24]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh ref={mesh} scale={diameter} frustumCulled={false} raycast={() => {}}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial ref={material} uniforms={uniforms} vertexShader={blackHoleBillboardVertex} fragmentShader={fragmentShader} transparent depthWrite={false} />
      </mesh>
    </>
  );
}
