import type { Camera, Points, Vector3 } from 'three';

type Bounds = { left: number; right: number; top: number; bottom: number };

export function labelsOverlap(a: Bounds, b: Bounds) {
  const gap = 4;
  return a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
}

export function labelBudget(width: number, height: number) {
  return Math.max(8, Math.min(36, Math.floor((width * height) / 30_000)));
}

export function pointBudget(total: number, diameter: number) {
  if (diameter < 2) return 1;
  if (diameter < 24) return Math.ceil(total / 8);
  if (diameter < 80) return Math.ceil(total / 3);
  if (diameter < 160) return Math.ceil(total * 0.65);
  return total;
}

export function updatePointDetail(points: Points, scratch: Vector3, camera: Camera, height: number, radius: number, opacity = 1) {
  points.visible = opacity > 0.005;
  if (!points.visible) return;
  points.getWorldPosition(scratch).applyMatrix4(camera.matrixWorldInverse);
  const depth = -scratch.z;
  const diameter = depth <= radius ? Infinity : (radius * camera.projectionMatrix.elements[5] * height) / depth;
  const count = pointBudget(points.geometry.attributes.position.count, diameter);
  if (points.geometry.drawRange.count !== count) points.geometry.setDrawRange(0, count);
}
