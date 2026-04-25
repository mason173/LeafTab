export const REVEAL_EASE_OUT_CUBIC = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const PANORAMIC_SURFACE_REVEAL_TIMING = '500ms linear';
export const LIMESTART_FRONT_CONTENT_REVEAL_TIMING = `250ms ${REVEAL_EASE_OUT_CUBIC}`;
export const LIMESTART_WALLPAPER_REVEAL_DELAY_MS = 250;
export const LIMESTART_WALLPAPER_OPACITY_DURATION_MS = 1250;
export const LIMESTART_ATMOSPHERE_OVERLAY_DELAY_MS = 250;
export const LIMESTART_ATMOSPHERE_OVERLAY_DURATION_MS = 250;
export const LIMESTART_GLOBAL_REVEAL_MASK_COLOR = 'rgba(52, 52, 54, 0.98)';
export const LIMESTART_GLOBAL_REVEAL_MASK_HOLD_MS = 80;
export const LIMESTART_GLOBAL_REVEAL_MASK_FADE_MS = 700;
export const LIMESTART_GLOBAL_REVEAL_UI_SCALE = 1.1;

export const INITIAL_REVEAL_OFFSET_PX = 100;
export const INITIAL_REVEAL_TIMING = `900ms ${REVEAL_EASE_OUT_CUBIC}`;
export const INITIAL_REVEAL_HIDDEN_OPACITY = 0;

export const WALLPAPER_FADE_REVEAL_DURATION_MS = 500;
export const WALLPAPER_COLOR_REVEAL_DURATION_MS = 500;
export const WALLPAPER_COLOR_REVEAL_DELAY_MS = 100;
export const WALLPAPER_SCALE_REVEAL_DURATION_MS = 500;
export const WALLPAPER_INITIAL_SCALE = 1.1;
export const WALLPAPER_INITIAL_REVEAL_OPACITY = 0.05;

export const resolveInitialRevealTransform = (ready: boolean, offsetPx = INITIAL_REVEAL_OFFSET_PX) => (
  ready ? 'translate3d(0, 0, 0)' : `translate3d(0, ${offsetPx}px, 0)`
);

export const resolveInitialRevealOpacity = (ready: boolean) => (ready ? 1 : INITIAL_REVEAL_HIDDEN_OPACITY);

export const resolveInitialRevealOpacityTransition = (timing = INITIAL_REVEAL_TIMING) => `opacity ${timing}`;

export const resolveInitialRevealTransformTransition = (timing = INITIAL_REVEAL_TIMING) => `transform ${timing}`;

export const resolveInitialRevealTransition = (timing = INITIAL_REVEAL_TIMING) => (
  `${resolveInitialRevealOpacityTransition(timing)}, ${resolveInitialRevealTransformTransition(timing)}`
);

type InitialRevealStyleOptions = {
  offsetPx?: number;
  timing?: string;
  disablePointerEventsUntilReady?: boolean;
};

export const resolveInitialRevealStyle = (
  ready: boolean,
  options?: InitialRevealStyleOptions,
) => {
  const timing = options?.timing || INITIAL_REVEAL_TIMING;

  return {
    opacity: resolveInitialRevealOpacity(ready),
    transform: resolveInitialRevealTransform(ready, options?.offsetPx),
    transition: resolveInitialRevealTransition(timing),
    willChange: ready ? undefined : 'opacity, transform',
    backfaceVisibility: 'hidden' as const,
    pointerEvents: !ready && options?.disablePointerEventsUntilReady ? 'none' as const : undefined,
  };
};
