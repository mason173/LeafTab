export const REVEAL_EASE_OUT_CUBIC = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const PANORAMIC_SURFACE_REVEAL_TIMING = '500ms linear';

export const INITIAL_REVEAL_OFFSET_PX = 100;
export const INITIAL_REVEAL_TIMING = `900ms ${REVEAL_EASE_OUT_CUBIC}`;

export const WALLPAPER_FADE_REVEAL_DURATION_MS = 500;
export const WALLPAPER_COLOR_REVEAL_DURATION_MS = 500;
export const WALLPAPER_COLOR_REVEAL_DELAY_MS = 100;
export const WALLPAPER_SCALE_REVEAL_DURATION_MS = 500;
export const WALLPAPER_INITIAL_SCALE = 1.1;

export const resolveInitialRevealTransform = (ready: boolean, offsetPx = INITIAL_REVEAL_OFFSET_PX) => (
  ready ? 'translate3d(0, 0, 0)' : `translate3d(0, ${offsetPx}px, 0)`
);

export const resolveInitialRevealOpacity = (ready: boolean) => (ready ? 1 : 0);
