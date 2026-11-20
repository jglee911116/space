import { useMemo } from 'react';
import { Color, DoubleSide, type Vector3 } from 'three';
import type { Appearance, Body } from '@/constants/space';
import { CraterSurface } from './crater-surface';
import { planetFragment, planetVertex } from './shaders';
import { useSurfaceMap } from './use-surface-map';

const shaderStyle: Record<Exclude<Appearance, 'craters'>, number> = { clouds: 0, earth: 1, rock: 2, bands: 3, ice: 4, pluto: 5 };

const surfaceFeatureStyle: Record<NonNullable<Body['surfaceFeatures']>, number> = { jupiter: 1, saturn: 2, mars: 3, neptune: 4, io: 5, europa: 6 };

export function PlanetMaterial({ body, lightOffset, loadSurfaceMap }: { body: Body; lightOffset: Vector3; loadSurfaceMap: boolean }) {
  const { appearance = 'rock', colors, surfaceMap, surfaceFeatures, polarCaps = false, radiusKm } = body;
  const texture = useSurfaceMap(surfaceMap?.file, loadSurfaceMap);
  const longitudeOffset = surfaceMap?.longitudeOffset ?? 0;

  const fillMissing = surfaceMap?.fillMissing ?? false;
  const uniforms = useMemo(
    () =>
      appearance === 'craters' && !texture
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
          },
    [appearance, colors, lightOffset, surfaceFeatures, polarCaps, texture, longitudeOffset, fillMissing],
  );

  return uniforms ? <shaderMaterial vertexShader={planetVertex} fragmentShader={planetFragment} uniforms={uniforms} /> : <CraterSurface seed={Math.round(radiusKm ?? 1)} fallback={colors[1]} />;
}

export function PlanetRings({ body }: { body: Body }) {
  return body.rings?.map(({ inner, outer, color, opacity }) => (
    <mesh key={inner} rotation-x={Math.PI / 2} raycast={() => {}}>
      <ringGeometry args={[inner * body.displayRadius, outer * body.displayRadius, 128]} />
      <meshBasicMaterial color={color} opacity={opacity} transparent depthWrite={false} side={DoubleSide} />
    </mesh>
  ));
}
