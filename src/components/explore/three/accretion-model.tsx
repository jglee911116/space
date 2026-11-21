'use client';

import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import { AdditiveBlending, Color, DoubleSide, Vector3, type Group, type MeshBasicMaterial, type ShaderMaterial } from 'three';
import { ACCRETION_MODEL_DIAMETER, ACCRETION_MODEL_EINSTEIN_RADIUS, ACCRETION_MODEL_EXIT_DISTANCE } from '../utils/zoom';
import { LensedStarfield } from './black-hole-lensing';
import { HelicalJets } from './helical-jets';
import { previewVisibility } from './map-detail';

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
      surface.z += envelope * (0.13 * sin(3.0 * theta - phase + r * 8.0) + 0.07 * sin(5.0 * theta - 2.0 * phase + r * 18.0));
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(surface, 1.0);
  }
`;
const diskFragment = /* glsl */ `
  varying vec2 diskPoint;
  uniform vec3 tint;
  uniform float visibility;
  uniform float phase;
  uniform bool animated;

  float stream(float angle, float radius) {
    float spiral = 0.5 + 0.5 * sin(angle * 3.0 + radius * 32.0 + 1.1 * sin(angle * 2.0));
    float filament = pow(0.5 + 0.5 * sin(angle * 9.0 + radius * 77.0 + spiral * 3.0), 4.0);
    return 0.58 * spiral + 0.42 * filament;
  }

  void main() {
    float r = length(diskPoint);
    float theta = atan(diskPoint.y, diskPoint.x);
    float spiral = 0.6 + 0.4 * sin(theta * 5.0 + 24.0 * sqrt(r) + 2.0 * sin(theta * 3.0));
    float rim = exp(-pow((r - 0.22) / 0.105, 2.0));
    float dust = exp(-r * 4.1) * spiral;
    float brightness = 0.8 * rim + 0.86 * dust;
    float heat = rim;
    if (animated) {
      float inner = stream(theta - 3.0 * phase, r);
      float outer = stream(theta - phase, r);
      float flow = mix(inner, outer, smoothstep(0.22, 0.54, r));
      brightness = rim * (0.44 + 0.74 * flow) + exp(-r * 3.4) * (0.16 + 0.82 * flow);
      heat *= 0.64 + 0.36 * flow;
    }
    float alpha = smoothstep(0.13, 0.21, r) * (1.0 - smoothstep(0.55, 1.0, r)) * brightness;
    gl_FragColor = vec4(mix(tint, vec3(1.0, 0.95, 0.82), heat), alpha * visibility);
    #include <colorspace_fragment>
  }
`;

export function AccretionGeometry({ color, previewDiameter, time }: { color: string; previewDiameter?: number; time?: RefObject<number> }) {
  const group = useRef<Group>(null);
  const disk = useRef<ShaderMaterial>(null);
  const shadow = useRef<MeshBasicMaterial>(null);
  const position = useMemo(() => new Vector3(), []);
  const animated = time !== undefined;
  const uniforms = useMemo(() => ({
    tint: { value: new Color(color) },
    visibility: { value: 1 },
    phase: { value: 0 },
    animated: { value: animated },
  }), [animated, color]);
  const diameter = previewDiameter ?? ACCRETION_MODEL_DIAMETER;
  const segments = animated ? (previewDiameter === undefined ? 64 : 20) : 1;

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
    if (time) disk.current.uniforms.phase.value = (time.current * 0.48) % (2 * Math.PI);
  });

  return (
    <group ref={group} scale={diameter / ACCRETION_MODEL_DIAMETER}>
      <mesh rotation-x={-Math.PI / 2} raycast={() => {}}>
        <planeGeometry args={[ACCRETION_MODEL_DIAMETER, ACCRETION_MODEL_DIAMETER, segments, segments]} />
        <shaderMaterial ref={disk} uniforms={uniforms} vertexShader={diskVertex} fragmentShader={diskFragment} side={DoubleSide} transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      <mesh raycast={() => {}}>
        <sphereGeometry args={[0.73, 32, 24]} />
        <meshBasicMaterial ref={shadow} color="#050611" />
      </mesh>
    </group>
  );
}

export function AccretionModel({ object, onExit, showCounterjet, helicalJetTime }: { object: { color: string; visibleJet: boolean }; onExit: (direction: [number, number, number]) => void; showCounterjet?: boolean; helicalJetTime?: RefObject<number> }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const initialDistance = useRef(0);
  const jet = useMemo(() => {
    const points = new Float32Array(1800 * 3);
    let seed = 273;
    function random() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    }
    for (let i = 0; i < 1800; i++) {
      const y = random() * 5.1;
      const width = 0.035 + y * 0.044;
      points.set([Math.sin(y * 1.0) * y * 0.07 + (random() - 0.5) * width, y, (random() - 0.5) * width], i * 3);
    }
    return points;
  }, []);

  return (
    <>
      <LensedStarfield einsteinRadius={ACCRETION_MODEL_EINSTEIN_RADIUS} />
      <group rotation-z={-0.23}>
        <AccretionGeometry color={object.color} time={helicalJetTime} />
        {object.visibleJet && (
          helicalJetTime ? <HelicalJets color={object.color} time={helicalJetTime} /> :
            (showCounterjet ? [1, -1] : [1]).map((side) => (
              <points key={side} scale={side}>
                <bufferGeometry>
                  <bufferAttribute attach="attributes-position" args={[jet, 3]} />
                </bufferGeometry>
                <pointsMaterial color={object.color} size={0.048} transparent opacity={side === 1 ? 0.53 : 0.12} depthWrite={false} blending={AdditiveBlending} />
              </points>
            ))
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
