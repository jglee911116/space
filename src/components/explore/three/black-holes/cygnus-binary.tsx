import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { Color, Vector3, type Group } from 'three';
import { rotationPhase } from '../../utils/orbit';
import { surfaceVertex, supergiantFragment } from '../shared/shaders';
import { StellarGlow } from '../stellar/stellar-glow';
import { AccretionGeometry } from './accretion-model';
import { HelicalJets } from './helical-jets';
import { CygnusGas } from './cygnus-gas';
import { previewVisibility } from '../maps/map-detail';
import type { AccretionDisk } from '@/constants/space';

export function CygnusBinary({ disk, size, days, time, preview = false }: { disk?: AccretionDisk; size: number; days: RefObject<number>; time: RefObject<number>; preview?: boolean }) {
  const binary = useRef<Group>(null);
  const center = useMemo(() => new Vector3(), []);
  const surfaceUniforms = useMemo(
    () => ({
      surfaceDark: { value: new Color('#456aaf') },
      surfaceBright: { value: new Color('#d9ecff') },
      cellScale: { value: 10 },
      brightness: { value: 1 },
    }),
    [],
  );
  useFrame(({ camera, size: viewport }) => {
    if (!binary.current) return;
    binary.current.rotation.y = rotationPhase(days.current, 5.6);
    if (preview) {
      binary.current.getWorldPosition(center).applyMatrix4(camera.matrixWorldInverse);
      const visibility = previewVisibility(size * 1.45, -center.z, camera, viewport.height);
      binary.current.visible = visibility > 0;
      binary.current.scale.setScalar(size * visibility);
    }
  });

  return (
    <group ref={binary} scale={size}>
      <group position={[0.44, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.19, preview ? 20 : 48, preview ? 14 : 32]} />
          {preview ? <meshBasicMaterial color="#b7d4ff" /> : <shaderMaterial uniforms={surfaceUniforms} vertexShader={surfaceVertex} fragmentShader={supergiantFragment} />}
        </mesh>
        {!preview && <StellarGlow radius={0.19} color="#8dbaff" strength={0.8} />}
      </group>
      <group position={[-0.31, 0, 0]} rotation-z={-0.24} scale={0.081}>
        <AccretionGeometry disk={disk} color="#eea88b" time={time} lowDetail={preview} />
        <HelicalJets color="#8fbcff" time={time} counterjet={0.15} collimation={0.74} lowDetail={preview} />
      </group>
      <CygnusGas rate={disk?.rate ?? 0} time={time} preview={preview} />
    </group>
  );
}
