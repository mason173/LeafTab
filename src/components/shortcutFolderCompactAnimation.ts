export type OverlayAnimationRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type FolderMotionPhase = 'opening' | 'closing';

export const FOLDER_OPEN_DURATION_MS = 420;
export const FOLDER_CLOSE_DURATION_MS = 340;
export const FOLDER_OPEN_TOTAL_DURATION_MS = FOLDER_OPEN_DURATION_MS;
export const FOLDER_LABEL_REVEAL_START_PROGRESS = 0.44;

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

function resolveCubicBezierAxis(t: number, p1: number, p2: number): number {
  const inverse = 1 - t;
  return (3 * inverse * inverse * t * p1) + (3 * inverse * t * t * p2) + (t * t * t);
}

function resolveCubicBezierDerivative(t: number, p1: number, p2: number): number {
  const inverse = 1 - t;
  return (3 * inverse * inverse * p1)
    + (6 * inverse * t * (p2 - p1))
    + (3 * t * t * (1 - p2));
}

function evaluateCubicBezier(progress: number, x1: number, y1: number, x2: number, y2: number): number {
  const clampedProgress = clamp01(progress);
  if (clampedProgress <= 0 || clampedProgress >= 1) return clampedProgress;

  let t = clampedProgress;
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const x = resolveCubicBezierAxis(t, x1, x2) - clampedProgress;
    const derivative = resolveCubicBezierDerivative(t, x1, x2);
    if (Math.abs(x) < 1e-6 || Math.abs(derivative) < 1e-6) break;
    t -= x / derivative;
  }

  t = clamp01(t);
  return clamp01(resolveCubicBezierAxis(t, y1, y2));
}

export function easeIosOpen(progress: number): number {
  return evaluateCubicBezier(progress, 0.22, 1, 0.36, 1);
}

export function easeIosClose(progress: number): number {
  return evaluateCubicBezier(progress, 0.32, 0.72, 0, 1);
}

export function resolveFolderMotionProgress(progress: number, phase: FolderMotionPhase): number {
  return phase === 'closing' ? easeIosClose(progress) : easeIosOpen(progress);
}

export function resolveFolderShellVisibility(progress: number): number {
  const normalizedProgress = clamp01(progress);
  return 1 - easeOutCubic(clamp01(normalizedProgress / 0.42));
}

export function resolveInterruptibleAnimationDuration(startProgress: number, targetProgress: number): number {
  const normalizedStart = clamp01(startProgress);
  const normalizedTarget = clamp01(targetProgress);
  const distance = Math.abs(normalizedTarget - normalizedStart);
  if (distance <= 0.0001) return 0;
  return Math.max(1, Math.round(FOLDER_OPEN_TOTAL_DURATION_MS * distance));
}

export function resolveChildAnimationProgress(progress: number, index: number, phase: FolderMotionPhase = 'opening'): number {
  void index;
  void phase;
  return clamp01(progress);
}

export function resolveChromeAnimationProgress(progress: number, phase: FolderMotionPhase = 'opening'): number {
  const normalizedProgress = clamp01(progress);
  if (FOLDER_LABEL_REVEAL_START_PROGRESS >= 1) return 1;
  return resolveFolderMotionProgress(
    clamp01((normalizedProgress - FOLDER_LABEL_REVEAL_START_PROGRESS) / (1 - FOLDER_LABEL_REVEAL_START_PROGRESS)),
    phase,
  );
}

export function resolveBackdropAnimationProgress(progress: number, phase: FolderMotionPhase = 'opening'): number {
  const normalizedProgress = clamp01(progress);
  const shiftedProgress = phase === 'opening'
    ? clamp01((normalizedProgress - 0.02) / 0.98)
    : clamp01(normalizedProgress / 0.96);
  return evaluateCubicBezier(
    shiftedProgress,
    phase === 'opening' ? 0.2 : 0.32,
    phase === 'opening' ? 0.88 : 0.72,
    phase === 'opening' ? 0.32 : 0,
    1,
  );
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
