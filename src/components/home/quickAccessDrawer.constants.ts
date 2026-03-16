const FALLBACK_VIEWPORT_HEIGHT_PX = 900;
const DRAWER_DEFAULT_SNAP_TOP_GAP_PX = 190;
const DRAWER_FULL_SNAP_TOP_GAP_PX = 40;
const DRAWER_COLLAPSED_HEIGHT_TOP_GAP_PX = 288;
const DRAWER_EXPANDED_HEIGHT_TOP_GAP_PX = 36;

const DRAWER_DEFAULT_SNAP_MIN = 0.68;
const DRAWER_DEFAULT_SNAP_MAX = 0.84;
const DRAWER_FULL_SNAP_MIN = 0.9;
const DRAWER_FULL_SNAP_MAX = 0.97;
const DRAWER_COLLAPSED_HEIGHT_MIN_VH = 63;
const DRAWER_COLLAPSED_HEIGHT_MAX_VH = 71;
const DRAWER_EXPANDED_HEIGHT_MIN_VH = 91;
const DRAWER_EXPANDED_HEIGHT_MAX_VH = 97;
const DRAWER_MIN_SNAP_GAP = 0.08;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const calcRatioByTopGap = (viewportHeight: number, topGapPx: number, min: number, max: number) => {
  const raw = (viewportHeight - topGapPx) / viewportHeight;
  return clamp(raw, min, max);
};

const calcVhByTopGap = (viewportHeight: number, topGapPx: number, minVh: number, maxVh: number) => {
  const rawVh = ((viewportHeight - topGapPx) / viewportHeight) * 100;
  return clamp(rawVh, minVh, maxVh);
};

export interface QuickAccessDrawerViewportMetrics {
  defaultSnapPoint: number;
  fullSnapPoint: number;
  collapsedHeightVh: number;
  expandedHeightVh: number;
}

export function resolveQuickAccessDrawerViewportMetrics(viewportHeight: number): QuickAccessDrawerViewportMetrics {
  const resolvedViewportHeight = Number.isFinite(viewportHeight) && viewportHeight > 0
    ? viewportHeight
    : FALLBACK_VIEWPORT_HEIGHT_PX;

  let defaultSnapPoint = calcRatioByTopGap(
    resolvedViewportHeight,
    DRAWER_DEFAULT_SNAP_TOP_GAP_PX,
    DRAWER_DEFAULT_SNAP_MIN,
    DRAWER_DEFAULT_SNAP_MAX,
  );
  const fullSnapPoint = calcRatioByTopGap(
    resolvedViewportHeight,
    DRAWER_FULL_SNAP_TOP_GAP_PX,
    DRAWER_FULL_SNAP_MIN,
    DRAWER_FULL_SNAP_MAX,
  );
  if (fullSnapPoint - defaultSnapPoint < DRAWER_MIN_SNAP_GAP) {
    defaultSnapPoint = Math.max(DRAWER_DEFAULT_SNAP_MIN, fullSnapPoint - DRAWER_MIN_SNAP_GAP);
  }

  const collapsedHeightVh = calcVhByTopGap(
    resolvedViewportHeight,
    DRAWER_COLLAPSED_HEIGHT_TOP_GAP_PX,
    DRAWER_COLLAPSED_HEIGHT_MIN_VH,
    DRAWER_COLLAPSED_HEIGHT_MAX_VH,
  );
  const expandedHeightVh = calcVhByTopGap(
    resolvedViewportHeight,
    DRAWER_EXPANDED_HEIGHT_TOP_GAP_PX,
    DRAWER_EXPANDED_HEIGHT_MIN_VH,
    DRAWER_EXPANDED_HEIGHT_MAX_VH,
  );

  return {
    defaultSnapPoint,
    fullSnapPoint,
    collapsedHeightVh,
    expandedHeightVh: Math.max(expandedHeightVh, collapsedHeightVh + 1),
  };
}

export const DRAWER_CONTENT_TOP_PADDING_EXPANDED_DELTA_PX = 24;
export const DRAWER_CONTENT_BACKDROP_BLUR_MAX_PX = 0;
export const DRAWER_CONTENT_BG_MAX_OPACITY = 1;
export const DRAWER_OVERLAY_MAX_OPACITY = 0.35;

export const DRAWER_SNAP_TRANSITION_LOCK_MS = 260;
export const DRAWER_SURFACE_LINKED_ANIMATION_MS = 620;
export const DRAWER_LAYOUT_LINKED_ANIMATION_MS = 320;

export const RHYTHM_BACKGROUND_SCALE_AT_FULL_DRAWER = 1.1;
export const WHEEL_SESSION_GAP_MS = 140;
export const WHEEL_SNAP_THRESHOLD = 60;
