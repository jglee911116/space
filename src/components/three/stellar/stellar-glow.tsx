import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { AdditiveBlending, Color, type ShaderMaterial } from 'three';
import { coronaFragment, coronaVertex } from '../shared/shaders';

type Props = {
  radius: number;
  color: string;
  strength?: number;
  paused?: boolean;
  activityDays?: RefObject<number>;
  brightness?: RefObject<number>;
};

export function StellarGlow({ radius, color, strength = 1, paused = true, activityDays, brightness }: Props) {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      radius: { value: radius },
      tint: { value: new Color(color) },
      intensity: { value: strength },
      solar: { value: activityDays !== undefined },
      flowTime: { value: 0 },
    }),
    [radius, color, strength, activityDays],
  );

  useFrame((_, delta) => {
    if (!material.current) return;
    const glow = material.current.uniforms;
    if (activityDays) glow.flowTime.value = activityDays.current * 240;
    else if (!paused) glow.flowTime.value += Math.min(delta, 0.1);
    if (brightness) glow.intensity.value = strength * brightness.current;
  });

  return (
    <mesh raycast={() => {}}>
      <planeGeometry args={[6.4 * radius, 6.4 * radius]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={coronaVertex} fragmentShader={coronaFragment} blending={AdditiveBlending} transparent depthWrite={false} />
    </mesh>
  );
}
