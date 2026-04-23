const DRAWER_CONTENT_HORIZONTAL_PADDING_PX = 16;
const DRAWER_ALPHABET_RAIL_WIDTH_PX = 52;
const DRAWER_ALPHABET_RAIL_OUTSIDE_GAP_PX = 10;
const DRAWER_ALPHABET_RAIL_VIEWPORT_EDGE_GAP_PX = 8;

export interface DrawerAlphabetRailLayout {
  dockOutside: boolean;
  railRightOffsetPx: number;
}

export function resolveDrawerAlphabetRailLayout(params: {
  contentWidth: number;
  viewportWidth: number;
}): DrawerAlphabetRailLayout {
  const resolvedContentWidth = Number.isFinite(params.contentWidth) && params.contentWidth > 0
    ? params.contentWidth
    : 0;
  const resolvedViewportWidth = Number.isFinite(params.viewportWidth) && params.viewportWidth > 0
    ? params.viewportWidth
    : resolvedContentWidth + DRAWER_CONTENT_HORIZONTAL_PADDING_PX * 2;
  const panelWidthPx = Math.min(
    resolvedContentWidth,
    Math.max(0, resolvedViewportWidth - DRAWER_CONTENT_HORIZONTAL_PADDING_PX * 2),
  );
  const horizontalGutterPx = Math.max(
    DRAWER_CONTENT_HORIZONTAL_PADDING_PX,
    (resolvedViewportWidth - panelWidthPx) / 2,
  );
  const minOutsideDockSpacePx = DRAWER_ALPHABET_RAIL_WIDTH_PX
    + DRAWER_ALPHABET_RAIL_OUTSIDE_GAP_PX
    + DRAWER_ALPHABET_RAIL_VIEWPORT_EDGE_GAP_PX;

  if (horizontalGutterPx < minOutsideDockSpacePx) {
    return {
      dockOutside: false,
      railRightOffsetPx: 0,
    };
  }

  return {
    dockOutside: true,
    railRightOffsetPx: -(DRAWER_ALPHABET_RAIL_WIDTH_PX + DRAWER_ALPHABET_RAIL_OUTSIDE_GAP_PX),
  };
}
