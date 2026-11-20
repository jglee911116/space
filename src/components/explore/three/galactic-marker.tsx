'use client';

import type { CatalogText } from '@/i18n/messages';
import { useLanguage } from '@/i18n/language';
import { useFrame } from '@react-three/fiber';
import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { CanvasTexture, SRGBColorSpace, Sprite, Vector3, type Object3D, type SpriteMaterial } from 'three';
import { labelBudget, labelsOverlap } from './map-detail';

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

type Marker = {
  sprite: Sprite;
  width: number;
  priority: number;
  labelOffset: number;
  wideLabelSpacing?: RefObject<number>;
  localOpacity?: RefObject<number>;
  guide?: RefObject<Object3D | null>;
  hovered: boolean;
  onHover?: (hovered: boolean) => void;
  showTexture: () => void;
  bounds: { left: number; right: number; top: number; bottom: number };
};

const Layer = createContext<RefObject<Set<Marker>> | null>(null);
let measuringContext: CanvasRenderingContext2D | null = null;

function labelWidth(label: string) {
  measuringContext ??= document.createElement('canvas').getContext('2d');
  if (!measuringContext) return 66;
  measuringContext.font = '500 28px system-ui, sans-serif';
  return Math.ceil(measuringContext.measureText(label).width) + 66;
}

export function GalacticLabelLayer({ children }: { children: ReactNode }) {
  const registry = useRef(new Set<Marker>());
  const scratch = useRef({ position: new Vector3(), projected: new Vector3(), candidates: [] as Marker[], accepted: [] as Marker[] });
  useFrame(({ camera, size }) => {
    const markers = registry.current;
    if (!markers.size) return;
    camera.updateMatrixWorld();
    const { width, height } = size;
    const { position, projected, candidates, accepted } = scratch.current;
    candidates.length = 0;
    accepted.length = 0;

    for (const marker of markers) {
      const { sprite, bounds } = marker;
      sprite.visible = false;
      if (marker.guide?.current) marker.guide.current.visible = false;
      const opacity = 1 - (marker.localOpacity?.current ?? 0);
      if (opacity <= 0.05) continue;

      sprite.getWorldPosition(position);
      projected.copy(position).applyMatrix4(camera.matrixWorldInverse);
      const depth = -projected.z;
      if (depth <= camera.near || depth > camera.far) continue;
      projected.applyMatrix4(camera.projectionMatrix);
      const centerX = (projected.x + 1) * width * 0.5;
      const offset = marker.labelOffset * (marker.wideLabelSpacing?.current ?? 1);
      const centerY = (1 - projected.y) * height * 0.5 - offset * 30;
      bounds.left = centerX - marker.width * 0.25;
      bounds.right = centerX + marker.width * 0.25;
      bounds.top = centerY - 15;
      bounds.bottom = centerY + 15;
      if (bounds.right < 0 || bounds.left > width || bounds.bottom < 0 || bounds.top > height) continue;

      const unit = (2 * depth) / (camera.projectionMatrix.elements[5] * Math.max(height, 1));
      sprite.center.y = 0.5 - offset;
      sprite.material.opacity = opacity;
      sprite.scale.set(marker.width * unit * 0.5, 30 * unit, 1);
      candidates.push(marker);
    }

    candidates.sort((a, b) => b.priority - a.priority || Number(b.hovered) - Number(a.hovered));
    const budget = labelBudget(width, height);
    for (const marker of candidates) {
      if (accepted.length >= budget) break;
      if (marker.priority < 3 && accepted.some(({ bounds }) => labelsOverlap(bounds, marker.bounds))) continue;
      accepted.push(marker);
      marker.showTexture();
      marker.sprite.visible = true;
      if (marker.guide?.current) marker.guide.current.visible = true;
    }

    for (const marker of markers) {
      if (marker.hovered && !marker.sprite.visible) {
        marker.hovered = false;
        marker.onHover?.(false);
      }
    }
  });
  return <Layer.Provider value={registry}>{children}</Layer.Provider>;
}

export function GalacticMarker({
  name,
  onSelect,
  color = '#ffc875',
  onHover,
  localOpacity,
  labelOffset = 0,
  wideLabelSpacing,
  priority = 0,
  guide,
}: {
  name: CatalogText;
  onSelect?: () => void;
  color?: string;
  onHover?: (hovered: boolean) => void;
  localOpacity?: RefObject<number>;
  guide?: RefObject<Object3D | null>;
  labelOffset?: number;
  wideLabelSpacing?: RefObject<number>;
  priority?: number;
}) {
  const { catalogText } = useLanguage();
  const label = catalogText(name);
  const layer = useContext(Layer);
  const sprite = useRef<Sprite>(null);
  const registered = useRef<Marker | null>(null);
  const hoverCallback = useRef(onHover);
  useEffect(() => {
    hoverCallback.current = onHover;
  }, [onHover]);

  useEffect(() => {
    const object = sprite.current;
    if (!layer || !object) return;

    let texture: CanvasTexture | null | undefined;
    const material: SpriteMaterial = object.material;
    const marker: Marker = {
      sprite: object,
      width: labelWidth(label),
      priority,
      localOpacity,
      guide,
      labelOffset,
      wideLabelSpacing,
      hovered: false,
      bounds: { left: 0, right: 0, top: 0, bottom: 0 },
      onHover: (hovered) => hoverCallback.current?.(hovered),
      showTexture: () => {
        if (texture !== undefined) return;
        texture = createMarkerTexture(label, color);
        material.map = texture;
        material.needsUpdate = true;
      },
    };
    registered.current = marker;
    const markers = layer.current;
    markers.add(marker);
    return () => {
      markers.delete(marker);
      registered.current = null;
      material.map = null;
      texture?.dispose();
    };
  }, [layer, label, color, priority, localOpacity, guide, labelOffset, wideLabelSpacing]);

  return (
    <sprite
      ref={sprite}
      visible={false}
      raycast={function (this: Sprite, raycaster, intersections) {
        if (this.visible) Sprite.prototype.raycast.call(this, raycaster, intersections);
      }}
      center={[0.5, 0.5]}
      renderOrder={2}
      onPointerOver={(event) => {
        if (!sprite.current?.visible || !onHover || !registered.current) return;
        registered.current.hovered = true;
        event.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => {
        if (registered.current) registered.current.hovered = false;
        onHover?.(false);
      }}
      onClick={(event) => {
        if (!sprite.current?.visible || !onSelect) return;
        event.stopPropagation();
        if (event.delta <= 4) onSelect();
      }}
    >
      <spriteMaterial transparent depthTest={false} depthWrite={false} />
    </sprite>
  );
}
