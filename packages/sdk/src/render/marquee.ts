import type { NodeWorldBox } from './SceneRegistry.js';

/** Marquee bounds in world coordinates, with nonnegative dimensions. */
export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectFromDrag(
  start: { x: number; y: number },
  current: { x: number; y: number },
): MarqueeRect {
  return {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  };
}

/** Inclusive world-space overlap: touching an edge or corner counts as a hit. */
export function boxesIntersectRect(boxes: readonly NodeWorldBox[], rect: MarqueeRect): string[] {
  return boxes.filter((box) => !(
    box.x + box.width < rect.x ||
    box.x > rect.x + rect.width ||
    box.y + box.height < rect.y ||
    box.y > rect.y + rect.height
  )).map((box) => box.id);
}

/** Pass screen-pixel coordinates; a drag exceeds 4px Euclidean distance by default. */
export function isDrag(
  start: { x: number; y: number },
  current: { x: number; y: number },
  thresholdPx = 4,
): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) > thresholdPx;
}
