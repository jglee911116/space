import { useEffect, useRef, useState } from 'react';
import { RepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from 'three';

export function useSurfaceMap(file?: string, enabled = true) {
  const [loadedMap, setLoadedMap] = useState<{ file: string; texture: Texture }>();

  const requestedMap = useRef<Texture | null>(null);
  useEffect(() => () => {
    requestedMap.current?.dispose();
    requestedMap.current = null;
  }, [file]);
  useEffect(() => {
    if (!file || !enabled || requestedMap.current) return;
    const texture = new TextureLoader().load(file, (loaded) => {
      if (requestedMap.current === loaded) setLoadedMap({ file, texture: loaded });
    });
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.anisotropy = 4;
    requestedMap.current = texture;
  }, [file, enabled]);

  return loadedMap?.file === file ? loadedMap?.texture : undefined;
}
