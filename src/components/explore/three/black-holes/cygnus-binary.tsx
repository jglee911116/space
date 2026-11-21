import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { Color, type Group } from 'three';
import { rotationPhase } from '../../utils/orbit';
import { surfaceVertex, supergiantFragment } from '../shared/shaders';
import { StellarGlow } from '../stellar/stellar-glow';
import { AccretionGeometry } from './accretion-model';
import { HelicalJets } from './helical-jets';
import { CygnusGas } from './cygnus-gas';

export function CygnusBinary({ size, days, time }: { size: number; days: RefObject<number>; time: RefObject<number> }) {
  const binary = useRef<Group>(null);
  const surfaceUniforms = useMemo(() => ({
    surfaceDark: { value: new Color('#456aaf') },
    surfaceBright: { value: new Color('#d9ecff') },
    cellScale: { value: 10 },
    brightness: { value: 1 },
  }), []);
  useFrame(() => {
    if (binary.current) binary.current.rotation.y = rotationPhase(days.current, 5.6);
  });

  return (
    <group ref={binary} scale={size}>
      <group position={[0.44, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.19, 48, 32]} />
          <shaderMaterial uniforms={surfaceUniforms} vertexShader={surfaceVertex} fragmentShader={supergiantFragment} />
        </mesh>
        <StellarGlow radius={0.19} color="#8dbaff" strength={0.8} />
      </group>
      <group position={[-0.31, 0, 0]} rotation-z={-0.24} scale={0.081}>
        <AccretionGeometry id="cygnus-x-1" color="#eea88b" time={time} />
        <HelicalJets color="#8fbcff" time={time} counterjet={0.15} collimation={0.74} />
      </group>
      <CygnusGas time={time} />
    </group>
  );
}
