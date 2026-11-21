import { MathUtils, type Camera, type OrthographicCamera, type PerspectiveCamera, type Points, type Vector3 } from 'three';

export const PREVIEW_HIDDEN_PX = 5;
export const PREVIEW_OPAQUE_PX = 18;

export function projectedPreviewDiameter(diameter: number, depth: number, camera: PerspectiveCamera | OrthographicCamera, viewportHeight: number) {
  if (depth <= camera.near || depth >= camera.far) return 0;
  const perspectiveDepth = 'isPerspectiveCamera' in camera ? depth : 1;
  return diameter * camera.projectionMatrix.elements[5] * viewportHeight / (2 * perspectiveDepth);
}

export function previewOpacity(pixels: number) {
  return MathUtils.smoothstep(pixels, PREVIEW_HIDDEN_PX, PREVIEW_OPAQUE_PX);
}

export function previewVisibility(diameter: number, depth: number, camera: PerspectiveCamera | OrthographicCamera, viewportHeight: number) {
  return previewOpacity(projectedPreviewDiameter(diameter, depth, camera, viewportHeight));
}

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

export function projectedDiameter(object: Points, scratch: Vector3, camera: Camera, height: number, radius: number) {
  object.getWorldPosition(scratch).applyMatrix4(camera.matrixWorldInverse);
  const depth = -scratch.z;
  return depth <= radius ? Infinity : (radius * camera.projectionMatrix.elements[5] * height) / depth;
}

export function updatePointDetail(points: Points, scratch: Vector3, camera: Camera, height: number, radius: number, opacity = 1) {
  points.visible = opacity > 0.005;
  if (!points.visible) return;
  const diameter = projectedDiameter(points, scratch, camera, height, radius);
  const count = pointBudget(points.geometry.attributes.position.count, diameter);
  if (points.geometry.drawRange.count !== count) points.geometry.setDrawRange(0, count);
}
