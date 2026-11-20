import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { AdditiveBlending, CubicBezierCurve3, MathUtils, Vector3, type Group } from 'three';
import { rotationPhase, stellarTextureShear } from '../utils/orbit';
import { coronaVertex } from './shaders';

// Representative active regions. Recurrence and time offsets are in preview days.
const regions = [
  { longitude: 0.22, latitude: 0.27, height: 0.20, span: 0.19, recurrence: 0.26, offset: 0.03 },
  { longitude: 2.50, latitude: -0.31, height: 0.30, span: 0.24, recurrence: 0.42, offset: 0.09 },
  { longitude: 3.85, latitude: 0.42, height: 0.17, span: 0.16, recurrence: 0.32, offset: 0.19 },
  { longitude: 5.34, latitude: -0.22, height: 0.22, span: 0.19, recurrence: 0.38, offset: 0 },
];

const loopVertex = /* glsl */ `
  uniform float radius;
  uniform float expansion;
  varying float arc;
  varying float altitude;
  varying float rim;

  void main() {
    arc = uv.x;
    altitude = length(position) / radius - 1.0;
    vec3 raised = position * (1.0 + max(altitude, 0.0) * expansion);
    vec4 view = modelViewMatrix * vec4(raised, 1.0);
    rim = abs(dot(normalize(normalMatrix * normal), normalize(view.xyz)));
    gl_Position = projectionMatrix * view;
  }
`;

const loopFragment = /* glsl */ `
  uniform float burst;
  uniform float flow;
  varying float arc;
  varying float altitude;
  varying float rim;

  void main() {
    float filament = 0.72 + 0.18 * sin(arc * 17.0 - flow * 3.2) + 0.10 * sin(arc * 46.0 - flow * 1.7);
    float opacity = filament * smoothstep(0.04, 0.76, rim) * (0.12 + 0.42 * burst);
    opacity *= smoothstep(-0.002, 0.015, altitude);
    vec3 tint = mix(vec3(1.0, 0.15, 0.035), vec3(1.0, 0.78, 0.34), burst * 0.84);
    gl_FragColor = vec4(tint, opacity);
    #include <colorspace_fragment>
  }
`;

const flareFragment = /* glsl */ `
  uniform float radius;
  uniform float burst;
  varying vec2 offset;

  void main() {
    float r = length(offset) / radius;
    float bloom = exp(-r * r * 490.0) * (1.0 - smoothstep(0.06, 0.125, r));
    float core = exp(-r * r * 3800.0);
    gl_FragColor = vec4(mix(vec3(1.0, 0.38, 0.10), vec3(1.0, 0.95, 0.78), core), burst * (0.27 * bloom + 0.72 * core));
    #include <colorspace_fragment>
  }
`;

type Props = {
  radius: number;
  days: RefObject<number>;
  activityDays: RefObject<number>;
  spinDays?: number;
  poleSpinDays?: number;
};

export function SolarProminences({ radius, days, activityDays, spinDays, poleSpinDays }: Props) {
  const groups = useRef<(Group | null)[]>([]);
  const loops = useMemo(
    () => regions.map(({ longitude, latitude, span, height }) => {
      const surfacePoint = (angle: number) => new Vector3(Math.cos(latitude) * Math.cos(angle), Math.sin(latitude), Math.cos(latitude) * Math.sin(angle));
      const strands = [-1, 0, 1].map((strand) => {
        const start = surfacePoint(longitude - span + strand * 0.025).multiplyScalar(radius * 0.993);
        const end = surfacePoint(longitude + span + strand * 0.033).multiplyScalar(radius * 0.993);
        const crest = surfacePoint(longitude + strand * 0.04).multiplyScalar(radius * height * (0.98 - Math.abs(strand) * 0.22));
        return new CubicBezierCurve3(start, start.clone().add(crest), end.clone().add(crest), end);
      });
      return {
        strands,
        footpoint: surfacePoint(longitude).multiplyScalar(radius * 1.01),
        uniforms: { radius: { value: radius }, burst: { value: 0 }, expansion: { value: 0 }, flow: { value: 0 } },
      };
    }),
    [radius],
  );

  useFrame(() => {
    const phase = rotationPhase(days.current, spinDays);
    const shear = stellarTextureShear(days.current, spinDays, poleSpinDays);
    const time = activityDays.current;
    regions.forEach(({ latitude, recurrence, offset }, index) => {
      const group = groups.current[index];
      if (group) group.rotation.y = phase + shear * Math.sin(latitude) ** 2;

      const elapsed = (time + offset) % recurrence;
      // A rapid rise followed by a slower, multi-stage decay around each active region.
      const burst = MathUtils.smoothstep(elapsed, 0, 0.007) * (1 - MathUtils.smoothstep(elapsed, 0.008, 0.065));
      const loopsCooling = 1 - MathUtils.smoothstep(elapsed, 0.023, 0.10);
      const uniforms = loops[index].uniforms;
      uniforms.burst.value = burst;
      uniforms.expansion.value = 0.22 * Math.sin(time * 33 + index) + 0.67 * MathUtils.smoothstep(elapsed, 0, 0.024) * loopsCooling;
      uniforms.flow.value = time * 240 + index;
    });
  });

  return loops.map(({ strands, footpoint, uniforms }, index) => (
    <group key={index} ref={(group) => { groups.current[index] = group; }}>
      {strands.map((path, strand) => (
        <mesh key={strand} raycast={() => {}}>
          <tubeGeometry args={[path, 32, radius * (strand === 1 ? 0.010 : 0.005), 5, false]} />
          <shaderMaterial uniforms={uniforms} vertexShader={loopVertex} fragmentShader={loopFragment} blending={AdditiveBlending} transparent depthWrite={false} />
        </mesh>
      ))}
      <mesh position={footpoint} raycast={() => {}}>
        <planeGeometry args={[0.26 * radius, 0.26 * radius]} />
        <shaderMaterial uniforms={uniforms} vertexShader={coronaVertex} fragmentShader={flareFragment} blending={AdditiveBlending} transparent depthWrite={false} />
      </mesh>
    </group>
  ));
}
