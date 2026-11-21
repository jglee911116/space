import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { AdditiveBlending, Color, Sphere, Vector3, type Points, type ShaderMaterial, type Texture } from 'three';
import { ACCRETION_MODEL_DIAMETER } from '../../utils/zoom';
import { previewOpacity, projectedPreviewDiameter } from '../maps/map-detail';

const FULL_PARTICLES_PER_STRAND = 420;
const PREVIEW_PARTICLES_PER_STRAND = 100;
const STRANDS = 4;

const vertexShader = /* glsl */ `
  uniform float phase;
  uniform float pixelRatio;
  uniform bool preview;
  uniform float visibility;
  uniform float counterjet;
  uniform float collimation;
  uniform bool mapped;
  uniform sampler2D observationMap;
  varying float glow;
  varying vec3 observedColor;
  varying vec2 streakAxis;
  varying float streakWidth;

  void main() {
    float side = position.z;
    float progress = fract(position.x + phase);
    float angle = progress * 17.0 - phase * 6.2831853 + position.y;
    float radius = collimation * (0.035 + 0.23 * pow(progress, 0.88)) * (0.54 + 0.46 * abs(sin(position.x * 83.0)));
    float height = 0.64 + pow(progress, 1.34) * (side > 0.0 ? 5.45 : 4.15);
    vec3 particle = vec3(radius * cos(angle), side * height, radius * sin(angle));
    vec4 view = modelViewMatrix * vec4(particle, 1.0);
    gl_Position = projectionMatrix * view;
    vec4 axis = projectionMatrix * modelViewMatrix * vec4(0.0, side, 0.0, 0.0);
    vec2 projectedAxis = (axis.xy * gl_Position.w - gl_Position.xy * axis.w) *
      vec2(projectionMatrix[1][1] / projectionMatrix[0][0], -1.0);
    float axisLength = length(projectedAxis);
    streakAxis = axisLength > 1e-17 ? projectedAxis / axisLength : vec2(0.0, 1.0);
    float modelScale = length(modelViewMatrix[0].xyz);
    float angleToCamera = length(cross(normalize(view.xyz), modelViewMatrix[1].xyz / modelScale));
    float distance = max(-view.z / modelScale, 1.0);
    float pointSize = clamp(92.0 / distance, preview ? 1.8 : 3.0, preview ? 9.0 : 15.0);
    gl_PointSize = pixelRatio * pointSize;
    streakWidth = mix(0.88, preview ? 0.51 : 0.31, clamp(angleToCamera, 0.0, 1.0));

    float envelope = smoothstep(0.0, 0.045, progress) * (1.0 - smoothstep(0.66, 1.0, progress));
    float knots = 0.21 + 0.79 * pow(0.5 + 0.5 * cos(position.x * 50.265482), 4.0);
    observedColor = vec3(0.0);
    if (mapped && side > 0.0) {
      observedColor = texture2D(observationMap, vec2(clamp((progress - 0.18) / 0.82, 0.002, 0.998), 0.5)).rgb;
      knots *= 0.78 + 0.92 * dot(observedColor, vec3(0.25, 0.50, 0.25)) * smoothstep(0.12, 0.39, progress);
    }
    float brightness = side > 0.0 ? 0.88 : counterjet * exp(-progress * 1.35);
    glow = envelope * knots * brightness * visibility * (preview ? 1.55 : 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 tint;
  varying float glow;
  varying vec3 observedColor;
  varying vec2 streakAxis;
  varying float streakWidth;

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float along = dot(p, streakAxis);
    float across = dot(p, vec2(-streakAxis.y, streakAxis.x));
    vec2 streak = vec2(along, across / (streakWidth * (0.72 + 0.28 * abs(along))));
    float radiusSquared = dot(streak, streak);
    if (radiusSquared >= 1.0) discard;
    float light = exp(-4.2 * radiusSquared) * (1.0 - radiusSquared);
    gl_FragColor = vec4(mix(tint, max(tint * 0.6, observedColor), 0.37 * step(0.015, length(observedColor))), glow * light);
    #include <colorspace_fragment>
  }
`;

export function HelicalJets({ color, time, previewDiameter, observation, counterjet = 0.30, collimation = 1 }: {
  color: string; time: RefObject<number>; previewDiameter?: number; observation?: Texture; counterjet?: number; collimation?: number;
}) {
  const material = useRef<ShaderMaterial>(null);
  const points = useRef<Points>(null);
  const position = useMemo(() => new Vector3(), []);
  const bounds = useMemo(() => new Sphere(new Vector3(), 6.2), []);
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const preview = previewDiameter !== undefined;
  const uniforms = useMemo(() => ({
    phase: { value: 0 },
    pixelRatio: { value: pixelRatio },
    tint: { value: new Color(color).lerp(new Color('#c5ddff'), 0.42) },
    preview: { value: preview },
    visibility: { value: 1 },
    counterjet: { value: counterjet },
    collimation: { value: collimation },
    mapped: { value: observation !== undefined },
    observationMap: { value: observation ?? null },
  }), [collimation, color, counterjet, observation, pixelRatio, preview]);
  const particles = useMemo(() => {
    const count = preview ? PREVIEW_PARTICLES_PER_STRAND : FULL_PARTICLES_PER_STRAND;
    const positions = new Float32Array(count * STRANDS * 3);
    let offset = 0;
    for (let index = 0; index < count; index++) {
      // Every prefix of the buffer samples the full length of both jets.
      const progress = (index * 0.61803398875) % 1;
      for (const side of [1, -1]) {
        for (const strand of [0, Math.PI]) {
          positions.set([progress, strand + 0.37 * Math.sin(index * 8.7), side], offset);
          offset += 3;
        }
      }
    }
    return positions;
  }, [preview]);

  useFrame(({ camera, size }) => {
    if (!points.current || !material.current) return;
    if (previewDiameter !== undefined) {
      points.current.getWorldPosition(position).applyMatrix4(camera.matrixWorldInverse);
      const pixels = projectedPreviewDiameter(previewDiameter, -position.z, camera, size.height);
      const visibility = previewOpacity(pixels);
      points.current.visible = visibility > 0;
      if (!points.current.visible) return;
      const count = STRANDS * (pixels >= 160 ? PREVIEW_PARTICLES_PER_STRAND : pixels >= 54 ? 44 : 20);
      if (points.current.geometry.drawRange.count !== count) points.current.geometry.setDrawRange(0, count);
      material.current.uniforms.visibility.value = visibility;
    }
    material.current.uniforms.phase.value = (time.current * 1.48) % 1;
  });

  return (
    <points ref={points} scale={previewDiameter === undefined ? 1 : previewDiameter / ACCRETION_MODEL_DIAMETER} raycast={() => {}}>
      <bufferGeometry boundingSphere={bounds}>
        <bufferAttribute attach="attributes-position" args={[particles, 3]} />
      </bufferGeometry>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  );
}
