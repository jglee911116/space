import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function ObservedBodyModel({ file, radius }: { file: string; radius: number }) {
  const { scene } = useLoader(GLTFLoader, file);
  const model = useMemo(() => {
    const bounds = new Box3().setFromObject(scene);
    const size = bounds.getSize(new Vector3());
    return {
      object: scene.clone(true),
      center: bounds.getCenter(new Vector3()).negate(),
      scale: 2 * radius / Math.max(size.x, size.y, size.z),
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
