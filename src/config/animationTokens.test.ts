import { describe, expect, it } from 'vitest';

import {
  INITIAL_REVEAL_TIMING,
  resolveInitialRevealOpacityTransition,
  resolveInitialRevealStyle,
  resolveInitialRevealTransition,
} from '@/config/animationTokens';

describe('initial reveal style', () => {
  it('exposes shared reveal transitions for consistent boot animation wiring', () => {
    expect(resolveInitialRevealOpacityTransition()).toBe(`opacity ${INITIAL_REVEAL_TIMING}`);
    expect(resolveInitialRevealTransition()).toBe(
      `opacity ${INITIAL_REVEAL_TIMING}, transform ${INITIAL_REVEAL_TIMING}`,
    );
  });

  it('keeps UI invisible and non-interactive before reveal when requested', () => {
    expect(resolveInitialRevealStyle(false, { disablePointerEventsUntilReady: true })).toEqual({
      opacity: 0,
      transform: 'translate3d(0, 100px, 0)',
      transition: `opacity ${INITIAL_REVEAL_TIMING}, transform ${INITIAL_REVEAL_TIMING}`,
      willChange: 'opacity, transform',
      backfaceVisibility: 'hidden',
      pointerEvents: 'none',
    });
  });

  it('returns settled visual state after reveal', () => {
    expect(resolveInitialRevealStyle(true)).toEqual({
      opacity: 1,
      transform: 'translate3d(0, 0, 0)',
      transition: `opacity ${INITIAL_REVEAL_TIMING}, transform ${INITIAL_REVEAL_TIMING}`,
      willChange: undefined,
      backfaceVisibility: 'hidden',
      pointerEvents: undefined,
    });
  });
});
