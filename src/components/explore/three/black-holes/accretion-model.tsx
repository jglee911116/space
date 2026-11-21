'use client';

import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import { AdditiveBlending, Color, DoubleSide, Vector3, type Group, type MeshBasicMaterial, type ShaderMaterial } from 'three';
import { ACCRETION_MODEL_DIAMETER, ACCRETION_MODEL_EINSTEIN_RADIUS, ACCRETION_MODEL_EXIT_DISTANCE } from '../../utils/zoom';
import { LensedStarfield } from './black-hole-lensing';
import { HelicalJets } from './helical-jets';
import { previewVisibility } from '../maps/map-detail';
import { spatialNoise } from '../shared/shaders';
import { useSurfaceMap } from '../shared/use-surface-map';
import type { AccretionDisk } from '@/constants/space';
import { ACCRETION_SHADOW_RADIUS, LENSED_FLOW_DIAMETER, lensedAccretionFragment, lensedAccretionVertex } from './lensed-accretion-flow';

// 원반 데이터가 없는 대상의 기본 회전 속도·반경 폭·대비
const DEFAULT_DISK: AccretionDisk = { rate: 0.67, width: 0.12, contrast: 0.72 };

const diskVertex = /* glsl */ `
  varying vec2 diskPoint;
  uniform float phase;
  uniform bool animated;

  void main() {
    diskPoint = uv * 2.0 - 1.0;
    vec3 surface = position;
    if (animated) {
      float r = length(diskPoint);
      float theta = atan(diskPoint.y, diskPoint.x + 0.00001);
      float envelope = smoothstep(0.1, 0.22, r) * (1.0 - smoothstep(0.36, 0.83, r));
      surface.z += envelope * (0.10 * sin(3.0 * theta - phase + r * 8.0) + 0.065 * sin(5.0 * theta - 2.0 * phase + r * 18.0));
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(surface, 1.0);
  }
`;
const diskFragment = /* glsl */ `
  varying vec2 diskPoint;
  uniform vec3 tint;
  uniform float visibility;
  uniform float phase;
  uniform float width;
  uniform float contrast;
  uniform sampler2D observationMap;
  uniform bool hasObservation;
  uniform bool preview;
  ${spatialNoise}

  float stream(float angle, float radius) {
    vec3 p = vec3(vec2(cos(angle), sin(angle)) * (5.0 + radius * 20.0), radius * 28.0);
    float broad = noise(p);
    float detail = preview ? 0.5 : noise(p * 3.1 + broad * 1.7);
    return smoothstep(0.14, 0.87, 0.74 * broad + 0.26 * detail);
  }

  void main() {
    float r = length(diskPoint);
    if (r <= 0.105 || r >= 0.98) discard;
    float theta = atan(diskPoint.y, diskPoint.x);
    float winding = theta + 3.8 * log(max(0.17, r));
    float inner = stream(winding - 3.0 * phase, r);
    float outer = stream(winding - phase, r);
    float flow = mix(inner, outer, smoothstep(0.25, 0.58, r));
    float softened = 1.0 - smoothstep(0.014, 0.045, fwidth(r));
    float infall = 0.5 + 0.5 * sin(58.0 * r - 2.0 * (theta - phase) + 2.0 * phase);
    float filaments = pow(0.5 + 0.5 * sin(r * 115.0 - 4.0 * winding + 7.0 * flow), 3.0) * softened;
    filaments *= mix(0.82, 1.12, infall);
    float rim = exp(-pow((r - 0.247 - 0.016 * (flow - 0.5)) / width, 2.0));
    float shoulder = exp(-pow((r - 0.36) / 0.23, 2.0));
    float lamplight = 0.79 + 0.21 * cos(theta + 0.9);
    vec3 observed = vec3(0.0);
    if (hasObservation) {
      vec2 azimuth = diskPoint / r;
      observed = texture2D(observationMap, 0.5 + azimuth * 0.215).rgb;
      lamplight = mix(lamplight, 0.30 + 1.19 * dot(observed, vec3(0.34, 0.53, 0.13)), 0.76);
    }
    float heat = rim * (0.28 + flow * contrast) * lamplight;
    float emission = heat * 1.35 + shoulder * (0.14 + 0.43 * flow + 0.26 * filaments) * lamplight;
    vec3 hot = hasObservation ? mix(tint, observed * 1.25, 0.52) : tint;
    vec3 color = mix(hot * 0.58, hot, smoothstep(0.0, 0.65, emission));
    color = mix(color, vec3(1.0, 0.94, 0.78), smoothstep(0.13, 0.96, heat));
    float alpha = smoothstep(0.115, 0.20, r) * (1.0 - smoothstep(0.53, 0.97, r)) * emission;
    gl_FragColor = vec4(color, min(1.0, alpha) * visibility);
    #include <colorspace_fragment>
  }
`;

export function AccretionGeometry({ disk: profile = DEFAULT_DISK, color, previewDiameter, time, lowDetail = false }: { disk?: AccretionDisk; color: string; previewDiameter?: number; time?: RefObject<number>; lowDetail?: boolean }) {
  const group = useRef<Group>(null);
  const disk = useRef<ShaderMaterial>(null);
  const shadow = useRef<MeshBasicMaterial>(null);
  const position = useMemo(() => new Vector3(), []);
  const animated = time !== undefined;
  const { rate, width, contrast } = profile;
  const observation = useSurfaceMap(profile.observationMap);
  const preview = previewDiameter !== undefined;
  const uniforms = useMemo(() => ({
    tint: { value: new Color(color) },
    visibility: { value: 1 },
    phase: { value: 0 },
    animated: { value: animated },
    width: { value: width },
    contrast: { value: contrast },
    preview: { value: preview },
    observationMap: { value: observation ?? null },
    hasObservation: { value: observation !== undefined },
  }), [animated, color, contrast, observation, preview, width]);
  const diameter = previewDiameter ?? ACCRETION_MODEL_DIAMETER;
  const segments = animated ? (preview || lowDetail ? 20 : 64) : 1;

  useFrame(({ camera, size }) => {
    if (!disk.current) return;
    if (previewDiameter !== undefined && group.current && shadow.current) {
      group.current.getWorldPosition(position).applyMatrix4(camera.matrixWorldInverse);
      const visibility = previewVisibility(diameter, -position.z, camera, size.height);
      group.current.visible = visibility > 0;
      if (!group.current.visible) return;
      disk.current.uniforms.visibility.value = visibility;
      shadow.current.opacity = visibility;
      shadow.current.transparent = visibility < 1;
      shadow.current.depthWrite = visibility === 1;
    }
    if (time) disk.current.uniforms.phase.value = (time.current * rate) % (2 * Math.PI);
  });

  return (
    <group ref={group} scale={diameter / ACCRETION_MODEL_DIAMETER}>
      <mesh rotation-x={-Math.PI / 2} raycast={() => {}}>
        <planeGeometry args={[ACCRETION_MODEL_DIAMETER, ACCRETION_MODEL_DIAMETER, segments, segments]} />
        <shaderMaterial ref={disk} uniforms={uniforms} vertexShader={diskVertex} fragmentShader={diskFragment} side={DoubleSide} transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      <mesh raycast={() => {}}>
        <sphereGeometry args={[ACCRETION_SHADOW_RADIUS, 32, 24]} />
        <meshBasicMaterial ref={shadow} color="#050611" />
      </mesh>
      {animated && !preview && !lowDetail && (
        <mesh raycast={() => {}}>
          <planeGeometry args={[LENSED_FLOW_DIAMETER, LENSED_FLOW_DIAMETER]} />
          <shaderMaterial uniforms={uniforms} vertexShader={lensedAccretionVertex} fragmentShader={lensedAccretionFragment}
            transparent depthWrite={false} blending={AdditiveBlending} />
        </mesh>
      )}
    </group>
  );
}

export function AccretionModel({ object, onExit, showCounterjet, time }: { object: { color: string; visibleJet: boolean; accretionDisk?: AccretionDisk }; onExit: (direction: [number, number, number]) => void; showCounterjet?: boolean; time: RefObject<number> }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const initialDistance = useRef(0);
  const jet = object.accretionDisk?.jet;
  const jetObservation = useSurfaceMap(jet?.map);

  return (
    <>
      <LensedStarfield einsteinRadius={ACCRETION_MODEL_EINSTEIN_RADIUS} />
      <group rotation-z={-0.23}>
        <AccretionGeometry disk={object.accretionDisk} color={object.color} time={time} />
        {object.visibleJet && (
          <HelicalJets color={object.color} time={time} observation={jetObservation}
            counterjet={jet ? (showCounterjet ? jet.counterjet : 0) : 0.30} collimation={jet?.collimation ?? 1} />
        )}
      </group>
      <OrbitControls
        ref={controls}
        enablePan={false}
        minDistance={2.4}
        maxDistance={30}
        onStart={() => {
          initialDistance.current = controls.current?.getDistance() ?? 0;
        }}
        onEnd={() => {
          const orbit = controls.current;
          if (!orbit) return;
          const radius = orbit.getDistance();
          if (radius > initialDistance.current && radius >= ACCRETION_MODEL_EXIT_DISTANCE) onExit(orbit.object.position.clone().sub(orbit.target).normalize().toArray());
        }}
      />
    </>
  );
}
