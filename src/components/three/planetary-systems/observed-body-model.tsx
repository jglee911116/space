import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { Box3, Vector3 } from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Draco 로 압축된 모형용 디코더(three 의 libs/draco/gltf 를 public/draco 에 복사) — 압축 모형을 열 때만 내려받는다.
const draco = new DRACOLoader().setDecoderPath('/draco/');

export function ObservedBodyModel({ file, radius }: { file: string; radius: number }) {
  const { scene } = useLoader(GLTFLoader, file, (loader) => loader.setDRACOLoader(draco));
  const model = useMemo(() => {
    const bounds = new Box3().setFromObject(scene);
    const size = bounds.getSize(new Vector3());
    return {
      object: scene.clone(true),
      center: bounds.getCenter(new Vector3()).negate(),
      scale: (2 * radius) / Math.max(size.x, size.y, size.z),
    };
  }, [scene, radius]);

  return (
    <group scale={model.scale}>
      <group position={model.center}>
        <primitive object={model.object} />
      </group>
    </group>
  );
}
