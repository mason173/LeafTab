import { describe, expect, it } from 'vitest';
import {
  buildInterpolatedRectTransform,
  easeOutCubic,
  FOLDER_CLOSE_DURATION_MS,
  FOLDER_LABEL_REVEAL_START_PROGRESS,
  FOLDER_OPEN_TOTAL_DURATION_MS,
  easeInOutCubic,
  resolveBackdropAnimationProgress,
  resolveSourcePreviewCloseRevealProgress,
  resolveChildAnimationProgress,
  resolveChromeAnimationProgress,
  resolveInterruptibleAnimationDuration,
  resolveSourcePreviewHiddenProgress,
} from '@/components/shortcutFolderCompactAnimation';

describe('shortcutFolderCompactAnimation', () => {
  it('scales interruptible durations by the remaining distance', () => {
    expect(resolveInterruptibleAnimationDuration(0, 1)).toBe(FOLDER_OPEN_TOTAL_DURATION_MS);
    expect(resolveInterruptibleAnimationDuration(1, 0)).toBe(FOLDER_CLOSE_DURATION_MS);
    expect(resolveInterruptibleAnimationDuration(0.25, 1)).toBe(Math.round(FOLDER_OPEN_TOTAL_DURATION_MS * 0.75));
    expect(resolveInterruptibleAnimationDuration(0.65, 0)).toBe(Math.round(FOLDER_CLOSE_DURATION_MS * 0.65));
  });

  it('delays later child ghosts without breaking reversibility', () => {
    expect(resolveChildAnimationProgress(0.1, 0)).toBeGreaterThan(resolveChildAnimationProgress(0.1, 4));
    expect(resolveChildAnimationProgress(1, 0)).toBe(1);
    expect(resolveChildAnimationProgress(1, 4)).toBe(1);
  });

  it('reveals chrome only after the configured opening threshold', () => {
    expect(resolveChromeAnimationProgress(FOLDER_LABEL_REVEAL_START_PROGRESS - 0.01)).toBe(0);
    expect(resolveChromeAnimationProgress(FOLDER_LABEL_REVEAL_START_PROGRESS)).toBe(0);
    expect(resolveChromeAnimationProgress(1)).toBe(1);
  });

  it('keeps backdrop and source preview progress within bounds', () => {
    expect(resolveBackdropAnimationProgress(-1)).toBe(0);
    expect(resolveBackdropAnimationProgress(2)).toBe(1);
    expect(resolveSourcePreviewHiddenProgress(-1)).toBe(0);
    expect(resolveSourcePreviewHiddenProgress(2)).toBe(1);
    expect(resolveSourcePreviewCloseRevealProgress(1)).toBe(0);
    expect(resolveSourcePreviewCloseRevealProgress(-1)).toBe(1);
    expect(resolveSourcePreviewCloseRevealProgress(2)).toBe(0);
  });

  it('uses a symmetric ease-in-out curve', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.25)).toBeCloseTo(1 - easeInOutCubic(0.75), 6);
  });

  it('supports ease-out timing for the main animation curve', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(1)).toBe(1);
  });

  it('interpolates between collapsed and expanded rect transforms', () => {
    const fromRect = { left: 0, top: 0, width: 100, height: 100 };
    const toRect = { left: 100, top: 50, width: 200, height: 200 };
    expect(buildInterpolatedRectTransform(fromRect, toRect, 0)).toBe('translate3d(-150px, -100px, 0) scale(0.5, 0.5)');
    expect(buildInterpolatedRectTransform(fromRect, toRect, 0.5)).toBe('translate3d(-75px, -50px, 0) scale(0.75, 0.75)');
    expect(buildInterpolatedRectTransform(fromRect, toRect, 1)).toBe('translate3d(0px, 0px, 0) scale(1, 1)');
  });
});
