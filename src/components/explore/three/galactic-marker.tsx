'use client';

import type { CatalogText } from '@/i18n/messages';
import { useLanguage } from '@/i18n/language';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { CanvasTexture, SRGBColorSpace, Vector3, type Sprite } from 'three';

function createMarkerTexture(name: string, color: string) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.font = '500 28px system-ui, sans-serif';
  canvas.width = Math.ceil(context.measureText(name).width) + 66;
  canvas.height = 60;
  context.font = '500 28px system-ui, sans-serif';
  context.fillStyle = '#12131e';
  context.strokeStyle = '#ad8057';
  context.lineWidth = 1.6;
  context.beginPath();
  context.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 28);
  context.fill();
  context.stroke();
  context.fillStyle = color;
  context.beginPath();
  context.arc(20, 30, 4, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#ffe2c3';
  context.textBaseline = 'middle';
  context.fillText(name, 34, 30);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function GalacticMarker({
  name,
  onSelect,
  color = '#ffc875',
  onHover,
  localOpacity,
  labelOffset = 0,
  wideLabelSpacing,
}: {
  name: CatalogText;
  onSelect?: () => void;
  color?: string;
  onHover?: (hovered: boolean) => void;
  localOpacity?: RefObject<number>;
  labelOffset?: number;
  wideLabelSpacing?: RefObject<number>;
}) {
  const { catalogText } = useLanguage();
  const label = catalogText(name);
  const marker = useRef<Sprite>(null);
  const position = useMemo(() => new Vector3(), []);
  const texture = useMemo(() => createMarkerTexture(label, color), [label, color]);
  useEffect(() => () => texture?.dispose(), [texture]);
  useFrame(({ camera, viewport, size }) => {
    if (!marker.current || !texture) return;
    marker.current.getWorldPosition(position);
    const worldPerPixel = viewport.getCurrentViewport(camera, position).height / Math.max(size.height, 1);
    marker.current.material.opacity = 1 - (localOpacity?.current ?? 0);
    marker.current.center.y = 0.5 - labelOffset * (wideLabelSpacing?.current ?? 1);
    marker.current.visible = marker.current.material.opacity > 0.05;
    marker.current.scale.set(texture.image.width * worldPerPixel * 0.5, texture.image.height * worldPerPixel * 0.5, 1);
  });

  return (
    <sprite
      ref={marker}
      center={[0.5, 0.5]}
      renderOrder={2}
      onPointerOver={(event) => {
        if (!marker.current?.visible || !onHover) return;
        event.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover?.(false)}
      onClick={(event) => {
        if (!marker.current?.visible || !onSelect) return;
        event.stopPropagation();
        if (event.delta <= 4) onSelect();
      }}
    >
      <spriteMaterial map={texture} color={texture ? '#ffffff' : '#ffc875'} transparent depthTest={false} depthWrite={false} />
    </sprite>
  );
}
