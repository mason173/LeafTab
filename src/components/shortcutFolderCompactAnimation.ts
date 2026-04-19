export type OverlayAnimationRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const FOLDER_OPEN_DURATION_MS = 320;
export const FOLDER_CLOSE_DURATION_MS = 320;
export const FOLDER_OPEN_TOTAL_DURATION_MS = FOLDER_OPEN_DURATION_MS;
export const FOLDER_LABEL_REVEAL_START_PROGRESS = 0.58;

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function mix(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

export function easeOutQuart(progress: number): number {
  const clampedProgress = clamp01(progress);
  return 1 - ((1 - clampedProgress) ** 4);
}

export function easeInCubic(progress: number): number {
  const clampedProgress = clamp01(progress);
  return clampedProgress * clampedProgress * clampedProgress;
}

export function easeOutCubic(progress: number): number {
  const clampedProgress = clamp01(progress);
  return 1 - ((1 - clampedProgress) ** 3);
}

export function easeInOutCubic(progress: number): number {
  const clampedProgress = clamp01(progress);
  if (clampedProgress < 0.5) {
    return 4 * clampedProgress * clampedProgress * clampedProgress;
  }
  return 1 - (((-2 * clampedProgress) + 2) ** 3) / 2;
}

export function resolveInterruptibleAnimationDuration(startProgress: number, targetProgress: number): number {
  const normalizedStart = clamp01(startProgress);
  const normalizedTarget = clamp01(targetProgress);
  const distance = Math.abs(normalizedTarget - normalizedStart);
  if (distance <= 0.0001) return 0;
  return Math.max(1, Math.round(FOLDER_OPEN_TOTAL_DURATION_MS * distance));
}

export function resolveChildAnimationProgress(progress: number, index: number): number {
  void index;
  return clamp01(progress);
}

export function resolveChromeAnimationProgress(progress: number): number {
  const normalizedProgress = clamp01(progress);
  if (FOLDER_LABEL_REVEAL_START_PROGRESS >= 1) return 1;
  return clamp01((normalizedProgress - FOLDER_LABEL_REVEAL_START_PROGRESS) / (1 - FOLDER_LABEL_REVEAL_START_PROGRESS));
}

export function resolveBackdropAnimationProgress(progress: number): number {
  return clamp01(progress);
}

export function interpolateRect(
  fromRect: OverlayAnimationRect,
  toRect: OverlayAnimationRect,
  progress: number,
): OverlayAnimationRect {
  const normalizedProgress = clamp01(progress);
  return {
    left: mix(fromRect.left, toRect.left, normalizedProgress),
    top: mix(fromRect.top, toRect.top, normalizedProgress),
    width: mix(fromRect.width, toRect.width, normalizedProgress),
    height: mix(fromRect.height, toRect.height, normalizedProgress),
  };
}

export function buildInterpolatedRectTransform(
  fromRect: OverlayAnimationRect,
  toRect: OverlayAnimationRect,
  progress: number,
): string {
  const normalizedProgress = clamp01(progress);
  const fromCenterX = fromRect.left + fromRect.width / 2;
  const fromCenterY = fromRect.top + fromRect.height / 2;
  const toCenterX = toRect.left + toRect.width / 2;
  const toCenterY = toRect.top + toRect.height / 2;
  const collapsedTranslateX = fromCenterX - toCenterX;
  const collapsedTranslateY = fromCenterY - toCenterY;
  const collapsedScaleX = fromRect.width / Math.max(toRect.width, 1);
  const collapsedScaleY = fromRect.height / Math.max(toRect.height, 1);
  const translateX = mix(collapsedTranslateX, 0, normalizedProgress);
  const translateY = mix(collapsedTranslateY, 0, normalizedProgress);
  const scaleX = mix(collapsedScaleX, 1, normalizedProgress);
  const scaleY = mix(collapsedScaleY, 1, normalizedProgress);
  return `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`;
}
