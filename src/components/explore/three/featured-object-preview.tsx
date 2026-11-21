import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { Color, Vector3, type Mesh, type ShaderMaterial } from 'three';
import type { FeaturedObject } from '@/constants/space';
import { ACCRETION_MODEL_DIAMETER, ACCRETION_MODEL_EXIT_DISTANCE, featuredOverviewDistanceKpc } from '../utils/zoom';
import { AccretionGeometry } from './accretion-model';
import { HelicalJets } from './helical-jets';
import { blackHoleBillboardVertex } from './black-hole-lensing';
import { previewVisibility } from './map-detail';
import { NebulaVolume } from './nebula-volume';
import { useSurfaceMap } from './use-surface-map';

const fragmentShader = /* glsl */ `
  uniform vec3 tint;
  uniform int form;
  uniform float visibility;
  varying vec2 screenPoint;

  float glow(float x) {
    return exp(-x * x);
  }

  void main() {
    vec2 p = screenPoint;
    float r = length(p);
    float edge = 1.0 - smoothstep(0.70, 0.99, r);
    if (edge <= 0.0) discard;
    vec3 color = mix(tint, vec3(1.0, 0.92, 0.82), 0.22);
    float alpha;
    if (form == 1) {
      vec2 sky = p * 7.0;
      float grain = fract(sin(dot(floor(sky), vec2(127.1, 311.7))) * 43758.5453);
      float stars = glow(length(fract(sky) - 0.5) / 0.23) * grain;
      alpha = glow(r / 0.46) * (0.35 + stars * 0.65);
    } else if (form == 2) {
      float band = glow((length(p * vec2(1.0, 1.37)) - 0.41) / 0.28);
      alpha = band * (0.48 + 0.25 * sin(p.x * 8.0 + p.y * 6.0)) + 0.17 * glow(r / 0.48);
    } else {
      alpha = glow(r / 0.21) + 0.42 * glow(r / 0.47);
    }
    gl_FragColor = vec4(color, min(1.0, alpha) * edge * visibility);
    #include <colorspace_fragment>
  }
`;

export function FeaturedObjectPreview({ object, focused, playbackTime }: { object: FeaturedObject; focused: boolean; playbackTime?: RefObject<number> }) {
  const image = object.observationImage;
  const texture = useSurfaceMap(image?.file, focused);
  const distance = featuredOverviewDistanceKpc(object);

  if (image) return <NebulaVolume texture={texture} radius={distance * 0.13} shape={image.shape} preview />;
  if (object.kind === 'black-hole') {
    const diameter = distance * (playbackTime ? ACCRETION_MODEL_DIAMETER / ACCRETION_MODEL_EXIT_DISTANCE : 0.68);
    return (
      <group rotation-z={-0.23}>
        <AccretionGeometry color={object.color} previewDiameter={diameter} time={playbackTime} />
        {playbackTime && <HelicalJets color={object.color} time={playbackTime} previewDiameter={diameter} />}
      </group>
    );
  }
  return <CompactObjectPreview object={object} diameter={distance * 0.26} />;
}

function CompactObjectPreview({ object, diameter }: { object: FeaturedObject; diameter: number }) {
  const mesh = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);
  const position = useMemo(() => new Vector3(), []);
  const form = object.kind === 'open-cluster' || object.kind === 'globular-cluster' ? 1 : object.extentLightYears > 0 ? 2 : 3;
  const uniforms = useMemo(() => ({
    tint: { value: new Color(object.color) },
    form: { value: form },
    visibility: { value: 0 },
  }), [form, object.color]);

  useFrame(({ camera, size }) => {
    if (!mesh.current || !material.current) return;
    mesh.current.getWorldPosition(position).applyMatrix4(camera.matrixWorldInverse);
    const visibility = previewVisibility(diameter, -position.z, camera, size.height);
    mesh.current.visible = visibility > 0;
    material.current.uniforms.visibility.value = visibility;
  });

  return (
    <mesh ref={mesh} scale={diameter} frustumCulled={false} raycast={() => {}}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={blackHoleBillboardVertex} fragmentShader={fragmentShader} transparent depthWrite={false} />
    </mesh>
  );
}
