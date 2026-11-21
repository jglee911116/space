import { useMemo } from 'react';
import { Color, DoubleSide, Vector4, type Vector3 } from 'three';
import type { Appearance, Body } from '@/constants/space';
import { CraterSurface } from './crater-surface';
import { planetFragment, planetVertex } from '../shared/shaders';
import { useSurfaceMap } from '../shared/use-surface-map';
import { outerSolarSurface } from './outer-solar-surface';

const shaderStyle: Record<Exclude<Appearance, 'craters'>, number> = { clouds: 0, earth: 1, rock: 2, bands: 3, ice: 4, pluto: 5 };

const surfaceFeatureStyle: Record<NonNullable<Body['surfaceFeatures']>, number> = { jupiter: 1, saturn: 2, mars: 3, neptune: 4, io: 5, europa: 6 };

export function PlanetMaterial({ body, lightOffset, loadSurfaceMap, showSurfaceMap = true }: { body: Body; lightOffset: Vector3; loadSurfaceMap: boolean; showSurfaceMap?: boolean }) {
  const { appearance = 'rock', colors, surfaceMap, surfaceFeatures, polarCaps = false, radiusKm, cloudBands } = body;
  const map = useSurfaceMap(surfaceMap?.file, loadSurfaceMap);
  const texture = showSurfaceMap ? map : undefined;
  const longitudeOffset = surfaceMap?.longitudeOffset ?? 0;
  const terrain = body.rockySurface ?? outerSolarSurface(body.id);

  const fillMissing = surfaceMap?.fillMissing ?? false;
  const uniforms = useMemo(
    () =>
      appearance === 'craters' && !texture && !terrain
        ? null
        : {
            dark: { value: new Color(colors[0]) },
            middle: { value: new Color(colors[1]) },
            light: { value: new Color(colors[2]) },
            lightOffset: { value: lightOffset },
            style: { value: shaderStyle[appearance === 'craters' ? 'rock' : appearance] },
            surfaceFeatures: { value: surfaceFeatures ? surfaceFeatureStyle[surfaceFeatures] : 0 },
            polarCaps: { value: polarCaps },
            surfaceMap: { value: texture ?? null },
            hasSurfaceMap: { value: texture !== undefined },
            mapOffset: { value: longitudeOffset },
            fillMissingMap: { value: fillMissing },
            rockSurface: { value: new Vector4(terrain?.[0] ?? 0, terrain?.[1] ?? 0, terrain?.[2] ?? 0, terrain?.[3] ?? 0) },
            cloudBands: { value: cloudBands ? new Vector4(...cloudBands) : new Vector4() },
          },
    [appearance, colors, lightOffset, surfaceFeatures, polarCaps, texture, longitudeOffset, fillMissing, terrain, cloudBands],
  );

  return uniforms ? <shaderMaterial vertexShader={planetVertex} fragmentShader={planetFragment} uniforms={uniforms} /> : <CraterSurface seed={Math.round(radiusKm ?? 1)} fallback={colors[1]} />;
}

const ringVertex = /* glsl */ `
  varying vec2 ringPoint;
  void main() {
    ringPoint = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragment = /* glsl */ `
  varying vec2 ringPoint;
  uniform sampler2D ringMap;
  uniform float innerRadius;
  uniform float outerRadius;
  void main() {
    float radial = (length(ringPoint) - innerRadius) / (outerRadius - innerRadius);
    vec4 band = texture2D(ringMap, vec2(clamp(radial, 0.00025, 0.99975), 0.5));
    gl_FragColor = band;
    #include <colorspace_fragment>
  }
`;

export function PlanetRings({ body }: { body: Body }) {
  const { displayRadius, ringMap } = body;
  const texture = useSurfaceMap(ringMap?.file);
  const innerRadius = (ringMap?.inner ?? 0) * displayRadius;
  const outerRadius = (ringMap?.outer ?? 0) * displayRadius;
  const uniforms = useMemo(
    () => ({ ringMap: { value: texture }, innerRadius: { value: innerRadius }, outerRadius: { value: outerRadius } }),
    [texture, innerRadius, outerRadius],
  );

  if (texture && ringMap) {
    return (
      <mesh rotation-x={Math.PI / 2} raycast={() => {}}>
        <ringGeometry args={[innerRadius, outerRadius, 192]} />
        <shaderMaterial uniforms={uniforms} vertexShader={ringVertex} fragmentShader={ringFragment} side={DoubleSide} transparent depthWrite={false} />
      </mesh>
    );
  }

  return body.rings?.map(({ inner, outer, color, opacity }) => (
    <mesh key={inner} rotation-x={Math.PI / 2} raycast={() => {}}>
      <ringGeometry args={[inner * body.displayRadius, outer * body.displayRadius, 128]} />
      <meshBasicMaterial color={color} opacity={opacity} transparent depthWrite={false} side={DoubleSide} />
    </mesh>
  ));
}
