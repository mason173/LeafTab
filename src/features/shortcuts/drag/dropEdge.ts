import type { DragRect, RootDropEdge } from './types';

// WeTab's merge zone is materially wider than our previous tiny center square.
// Use a larger middle band so vertical near-center placements can still merge.
const DROP_CENTER_THRESHOLD_X_RATIO = 0.25;
const DROP_CENTER_THRESHOLD_Y_RATIO = 0.25;
const DROP_CENTER_THRESHOLD_X_MAX_PX = 24;
const DROP_CENTER_THRESHOLD_Y_MAX_PX = 24;

export function getDropEdge(pointer: { x: number; y: number }, rect: DragRect): RootDropEdge {
  if (rect.width <= 0 || rect.height <= 0) return 'after';

  const normalizedX = Math.min(1, Math.max(0, (pointer.x - rect.left) / rect.width));
  const normalizedY = Math.min(1, Math.max(0, (pointer.y - rect.top) / rect.height));
  const centerThresholdX = Math.min(rect.width * DROP_CENTER_THRESHOLD_X_RATIO, DROP_CENTER_THRESHOLD_X_MAX_PX);
  const centerThresholdY = Math.min(rect.height * DROP_CENTER_THRESHOLD_Y_RATIO, DROP_CENTER_THRESHOLD_Y_MAX_PX);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const centeredX = Math.abs(pointer.x - centerX) <= centerThresholdX;
  const centeredY = Math.abs(pointer.y - centerY) <= centerThresholdY;

  if (centeredX && centeredY) {
    return 'center';
  }

  const distanceX = Math.abs(normalizedX - 0.5);
  const distanceY = Math.abs(normalizedY - 0.5);

  if (distanceX >= distanceY) {
    return normalizedX < 0.5 ? 'before' : 'after';
  }

  return normalizedY < 0.5 ? 'before' : 'after';
}

export function getReorderTargetIndex(
  activeIndex: number,
  overIndex: number,
  edge: Exclude<RootDropEdge, 'center'>,
): number {
  if (edge === 'before') {
    return activeIndex < overIndex ? overIndex - 1 : overIndex;
  }

  return activeIndex < overIndex ? overIndex : overIndex + 1;
}
