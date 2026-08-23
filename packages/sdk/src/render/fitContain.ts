/**
 * Fit a source rectangle inside a max box (contain / Uniform stretch).
 * Preserves aspect ratio; centers with offsets.
 */
export function fitContain(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number; offsetX: number; offsetY: number } {
  const maxW = Math.max(0, maxWidth);
  const maxH = Math.max(0, maxHeight);
  if (maxW === 0 || maxH === 0) {
    return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
  }
  if (!(sourceWidth > 0) || !(sourceHeight > 0)) {
    return { width: maxW, height: maxH, offsetX: 0, offsetY: 0 };
  }
  const scale = Math.min(maxW / sourceWidth, maxH / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    width,
    height,
    offsetX: (maxW - width) / 2,
    offsetY: (maxH - height) / 2,
  };
}
