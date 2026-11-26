export interface ScrollMetrics {
  y: number;
  height: number;
  content: number;
}

export function offsetAfterTouch({ y, height, content }: ScrollMetrics, dy: number) {
  const maxY = Math.max(0, content - height);
  return Math.max(0, Math.min(maxY, y - dy));
}
