import { useMemo } from 'react';
import { Color, DoubleSide, type Vector3 } from 'three';
import type { Appearance, Body } from '@/constants/space';
import { CraterSurface } from './crater-surface';
import { planetFragment, planetVertex } from './shaders';

const shaderStyle: Record<Exclude<Appearance, 'craters'>, number> = { clouds: 0, earth: 1, rock: 2, bands: 3, ice: 4, pluto: 5 };

export function PlanetMaterial({ body, lightOffset }: { body: Body; lightOffset: Vector3 }) {
  const { appearance = 'rock', colors, redSpot = false, polarCaps = false, radiusKm } = body;
  const uniforms = useMemo(
    () =>
      appearance === 'craters'
        ? null
        : {
            dark: { value: new Color(colors[0]) },
            middle: { value: new Color(colors[1]) },
            light: { value: new Color(colors[2]) },
            lightOffset: { value: lightOffset },
            style: { value: shaderStyle[appearance] },
            redSpot: { value: redSpot },
            polarCaps: { value: polarCaps },
          },
    [appearance, colors, lightOffset, redSpot, polarCaps],
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
