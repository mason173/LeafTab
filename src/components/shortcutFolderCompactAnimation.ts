export type OverlayAnimationRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const FOLDER_OPEN_DURATION_MS = 350;
export const FOLDER_CLOSE_DURATION_MS = 250;
export const FOLDER_OPENING_GHOST_STAGGER_STEP_MS = 14;
export const FOLDER_OPENING_GHOST_STAGGER_MAX_MS = 72;
export const FOLDER_OPEN_TOTAL_DURATION_MS = FOLDER_OPEN_DURATION_MS + FOLDER_OPENING_GHOST_STAGGER_MAX_MS;
export const FOLDER_LABEL_REVEAL_OPEN_DELAY_MS = 300;
export const FOLDER_LABEL_REVEAL_START_PROGRESS = (
  FOLDER_OPEN_TOTAL_DURATION_MS > 0
    ? FOLDER_LABEL_REVEAL_OPEN_DELAY_MS / FOLDER_OPEN_TOTAL_DURATION_MS
    : 0
);
export const FOLDER_SOURCE_PREVIEW_HIDDEN_SCALE = 0.9;

const SOURCE_PREVIEW_HIDE_COMPLETE_PROGRESS = 0.34;
const SOURCE_PREVIEW_CLOSE_REVEAL_PROGRESS = 0.12;

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
  const baseDurationMs = normalizedTarget > normalizedStart
    ? FOLDER_OPEN_TOTAL_DURATION_MS
    : FOLDER_CLOSE_DURATION_MS;
  return Math.max(1, Math.round(baseDurationMs * distance));
}

export function resolveChildAnimationProgress(progress: number, index: number): number {
  const normalizedProgress = clamp01(progress);
  const openingDelayMs = Math.min(
    FOLDER_OPENING_GHOST_STAGGER_MAX_MS,
    Math.max(0, index) * FOLDER_OPENING_GHOST_STAGGER_STEP_MS,
  );
  const delayProgress = openingDelayMs / Math.max(FOLDER_OPEN_TOTAL_DURATION_MS, 1);
  if (delayProgress >= 1) return 0;
  return clamp01((normalizedProgress - delayProgress) / (1 - delayProgress));
}

export function resolveChromeAnimationProgress(progress: number): number {
  const normalizedProgress = clamp01(progress);
  if (FOLDER_LABEL_REVEAL_START_PROGRESS >= 1) return 1;
  return clamp01((normalizedProgress - FOLDER_LABEL_REVEAL_START_PROGRESS) / (1 - FOLDER_LABEL_REVEAL_START_PROGRESS));
}

export function resolveBackdropAnimationProgress(progress: number): number {
  return clamp01(progress);
}

export function resolveSourcePreviewHiddenProgress(progress: number): number {
  return clamp01(clamp01(progress) / SOURCE_PREVIEW_HIDE_COMPLETE_PROGRESS);
}

export function resolveSourcePreviewCloseRevealProgress(progress: number): number {
  const normalizedProgress = clamp01(progress);
  if (normalizedProgress >= SOURCE_PREVIEW_CLOSE_REVEAL_PROGRESS) return 0;
  return clamp01(1 - (normalizedProgress / Math.max(SOURCE_PREVIEW_CLOSE_REVEAL_PROGRESS, 0.0001)));
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
