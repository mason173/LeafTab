import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import type { FolderShortcutDropIntent } from '@leaftab/workspace-core';
import ShortcutIcon from '@/components/ShortcutIcon';
import {
  clamp01,
  interpolateRect,
  mix,
  resolveChildAnimationProgress,
  resolveChromeAnimationProgress,
  resolveFolderShellVisibility,
} from '@/components/shortcutFolderCompactAnimation';
import type {
  FolderTransitionPhase,
  ShortcutFolderOpeningSourceSnapshot,
  ShortcutFolderOverlayRect,
} from '@/components/folderTransition/useFolderTransitionController';
import {
  FolderShortcutSurface,
  type FolderExtractDragStartPayload,
} from '@/features/shortcuts/components/FolderShortcutSurface';
import {
  getFolderPreviewRoot,
  getFolderPreviewSlotEntries,
  getFolderPreviewTitle,
} from '@/components/shortcuts/folderPreviewRegistry';
import type { DisplayMode } from '@/displayMode/config';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import { getShortcutChildren, isShortcutFolder } from '@/utils/shortcutFolders';

export type ShortcutFolderCompactOverlayProps = {
  open?: boolean;
  shortcut: Shortcut | null;
  transitionPhase: FolderTransitionPhase;
  transitionProgress: number;
  onOpenChange: (open: boolean) => void;
  openingSourceSnapshot?: ShortcutFolderOpeningSourceSnapshot | null;
  onOpeningLayoutReady?: () => void;
  onClosingLayoutReady?: () => void;
  rootGridColumns?: number;
  compactIconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  onRenameFolder: (folderId: string, name: string) => void;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu: (event: React.MouseEvent<HTMLDivElement>, folderId: string, shortcut: Shortcut) => void;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
  displayMode: DisplayMode;
};

type OverlayRect = ShortcutFolderOverlayRect;

type OverlayMetrics = {
  targetRect: OverlayRect;
  targetTitleRect: OverlayRect | null;
  targetChildRects: Map<string, OverlayRect>;
  targetChildLabelRects: Map<string, OverlayRect>;
};

const OVERLAY_Z_INDEX = 16000;
const FOLDER_PANEL_RADIUS_PX = 32;
const FOLDER_PANEL_MAX_VIEWPORT_RATIO = 0.78;
const FOLDER_PANEL_MAX_HEIGHT_PX = 680;
const FOLDER_PANEL_MAX_VISIBLE_ROWS = 5;
const HIDDEN_CHILD_OPENING_COLLAPSED_OPACITY = 0.32;
const COLLAPSED_CHILD_CONTENT_RATIO = 0.94;
const GHOST_ICON_BASE_SIZE = 72;
const FOLDER_PREVIEW_TITLE_FONT_SIZE_PX = 12;
const FOLDER_PANEL_TITLE_FONT_SIZE_PX = 22;
const FOLDER_CHILD_LABEL_FONT_SIZE_PX = 12;
const HIDDEN_CHILD_CLOSING_FADE_END_PROGRESS = 0.58;
const PANEL_WIDTH_CLASSNAME = 'w-[min(720px,calc(100vw-24px))] max-w-[720px]';
const PANEL_HORIZONTAL_MARGIN_PX = 24;
const PANEL_MAX_WIDTH_PX = 720;
const FOLDER_TITLE_PADDING_CLASSNAME = 'px-6 pb-5 pt-7';
const FOLDER_SCROLL_REGION_CLASSNAME = 'min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';
function buildFolderPanelSurfaceStyle(borderRadius: string, opacity = 1): React.CSSProperties {
  return {
    borderRadius,
    opacity,
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    boxShadow: 'none',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
  };
}

function copyRect(rect: DOMRect | OverlayRect | null | undefined): OverlayRect | null {
  if (!rect) return null;
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function rectEquals(left: OverlayRect | null | undefined, right: OverlayRect | null | undefined) {
  if (!left || !right) return left === right;
  return (
    Math.abs(left.left - right.left) <= 0.5
    && Math.abs(left.top - right.top) <= 0.5
    && Math.abs(left.width - right.width) <= 0.5
    && Math.abs(left.height - right.height) <= 0.5
  );
}

function mapsEqual(left: Map<string, OverlayRect>, right: Map<string, OverlayRect>) {
  if (left.size !== right.size) return false;
  for (const [key, value] of left.entries()) {
    const other = right.get(key);
    if (!rectEquals(value, other)) return false;
  }
  return true;
}

function escapeSelectorValue(value: string) {
  if (typeof window !== 'undefined' && window.CSS?.escape) {
    return window.CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}

function shouldCloseFolderFromOverlaySurfaceClick(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return true;
  }

  return !target.closest([
    '[data-folder-shortcut-grid-item="true"]',
    '[data-shortcut-drag-item="true"]',
    'button',
    'input',
    'textarea',
    'select',
    '[contenteditable=""]',
    '[contenteditable="true"]',
    '[contenteditable="plaintext-only"]',
  ].join(','));
}

function resolvePredictedPanelWidthPx() {
  if (typeof window === 'undefined') return PANEL_MAX_WIDTH_PX;
  return Math.max(320, Math.min(PANEL_MAX_WIDTH_PX, window.innerWidth - PANEL_HORIZONTAL_MARGIN_PX));
}

function readElementBorderRadiusPx(element: HTMLElement | null | undefined) {
  if (!element || typeof window === 'undefined') return null;
  const computedStyle = window.getComputedStyle(element);
  const resolvedRadius = Number.parseFloat(computedStyle.borderTopLeftRadius || '0');
  return Number.isFinite(resolvedRadius) ? resolvedRadius : null;
}

function getFallbackSourceRect(targetRect: OverlayRect): OverlayRect {
  const collapsedSize = Math.max(64, Math.min(92, targetRect.width * 0.18));
  return {
    left: targetRect.left + (targetRect.width - collapsedSize) / 2,
    top: targetRect.top + (targetRect.height - collapsedSize) / 2,
    width: collapsedSize,
    height: collapsedSize,
  };
}

function getFallbackSourceTitleRect(params: {
  sourceRect: OverlayRect;
  title: string;
}): OverlayRect {
  const { sourceRect, title } = params;
  const estimatedWidth = Math.max(
    56,
    Math.min(sourceRect.width, Math.round(title.length * FOLDER_PREVIEW_TITLE_FONT_SIZE_PX * 1.7)),
  );
  return {
    left: sourceRect.left + (sourceRect.width - estimatedWidth) / 2,
    top: sourceRect.top + sourceRect.height + 4,
    width: estimatedWidth,
    height: 16,
  };
}

function getVirtualCollapsedChildRect(params: {
  sourceRect: OverlayRect;
  index: number;
  total: number;
}): OverlayRect {
  const { sourceRect, index, total } = params;
  const columns = total <= 4 ? 2 : total <= 9 ? 3 : 4;
  const rows = Math.max(1, Math.ceil(total / columns));
  const inset = Math.max(8, Math.round(Math.min(sourceRect.width, sourceRect.height) * 0.12));
  const gap = Math.max(2, Math.round(Math.min(sourceRect.width, sourceRect.height) * 0.035));
  const innerWidth = Math.max(8, sourceRect.width - inset * 2);
  const innerHeight = Math.max(8, sourceRect.height - inset * 2);
  const tileWidth = Math.max(4, (innerWidth - gap * Math.max(0, columns - 1)) / columns);
  const tileHeight = Math.max(4, (innerHeight - gap * Math.max(0, rows - 1)) / rows);
  const tileSize = Math.max(4, Math.min(tileWidth, tileHeight));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const tilesInRow = Math.min(columns, total - row * columns);
  const rowWidth = tilesInRow * tileSize + Math.max(0, tilesInRow - 1) * gap;
  const startX = sourceRect.left + inset + (innerWidth - rowWidth) / 2;
  const totalGridHeight = rows * tileSize + Math.max(0, rows - 1) * gap;
  const startY = sourceRect.top + inset + (innerHeight - totalGridHeight) / 2;
  const contentSize = Math.max(4, tileSize * COLLAPSED_CHILD_CONTENT_RATIO);
  const contentInset = (tileSize - contentSize) / 2;

  return {
    left: startX + column * (tileSize + gap) + contentInset,
    top: startY + row * (tileSize + gap) + contentInset,
    width: contentSize,
    height: contentSize,
  };
}

function resolveAnimatedChildOpacity(params: {
  childProgress: number;
  motionPhase: 'opening' | 'closing';
  collapsedPreviewVisible: boolean;
}) {
  const { childProgress, motionPhase, collapsedPreviewVisible } = params;
  if (collapsedPreviewVisible) {
    return 1;
  }

  if (motionPhase === 'closing') {
    return clamp01((childProgress - HIDDEN_CHILD_CLOSING_FADE_END_PROGRESS) / (1 - HIDDEN_CHILD_CLOSING_FADE_END_PROGRESS));
  }

  return mix(HIDDEN_CHILD_OPENING_COLLAPSED_OPACITY, 1, childProgress);
}

function measureTargetChildRects(container: ParentNode | null | undefined, shortcuts: Shortcut[]) {
  const childRects = new Map<string, OverlayRect>();
  const childLabelRects = new Map<string, OverlayRect>();

  shortcuts.forEach((child) => {
    const escapedChildId = escapeSelectorValue(child.id);
    const childNode = container?.querySelector<HTMLElement>(`[data-folder-overlay-child-id="${escapedChildId}"]`);
    const childRect = copyRect(childNode?.getBoundingClientRect());
    if (childRect) {
      childRects.set(child.id, childRect);
    }

    const childLabelNode = container?.querySelector<HTMLElement>(`[data-folder-overlay-child-label-id="${escapedChildId}"]`);
    const childLabelRect = copyRect(childLabelNode?.getBoundingClientRect());
    if (childLabelRect) {
      childLabelRects.set(child.id, childLabelRect);
    }
  });

  return {
    childRects,
    childLabelRects,
  };
}

function getVirtualChildLabelStartRect(params: {
  sourceChildRect: OverlayRect;
  targetChildRect: OverlayRect;
  targetLabelRect: OverlayRect;
}) {
  const { sourceChildRect, targetChildRect, targetLabelRect } = params;
  const midpointRect = interpolateRect(sourceChildRect, targetChildRect, 0.48);
  return {
    left: midpointRect.left + (midpointRect.width - targetLabelRect.width) / 2,
    top: midpointRect.top + midpointRect.height + 10,
    width: targetLabelRect.width,
    height: targetLabelRect.height,
  };
}

function resolveAnimatedChildLabelOpacity(progress: number, motionPhase: 'opening' | 'closing') {
  if (motionPhase === 'closing') {
    return clamp01((progress - 0.18) / 0.82);
  }
  return clamp01((progress - 0.1) / 0.9);
}

function GhostShortcutIcon({
  shortcut,
  width,
  height,
  iconCornerRadius,
  iconAppearance,
}: {
  shortcut: Shortcut;
  width: number;
  height: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
}) {
  const contentScale = Math.min(width, height) / GHOST_ICON_BASE_SIZE;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <div
        className="flex items-center justify-center"
        style={{
          width: GHOST_ICON_BASE_SIZE,
          height: GHOST_ICON_BASE_SIZE,
          transform: `scale(${contentScale})`,
          transformOrigin: 'center center',
        }}
      >
        <ShortcutIcon
          icon={shortcut.icon}
          url={shortcut.url}
          shortcutId={shortcut.id}
          size={GHOST_ICON_BASE_SIZE}
          exact
          frame="never"
          fallbackStyle="emptyicon"
          fallbackLabel={shortcut.title}
          useOfficialIcon={shortcut.useOfficialIcon}
          autoUseOfficialIcon={shortcut.autoUseOfficialIcon}
          officialIconAvailableAtSave={shortcut.officialIconAvailableAtSave}
          officialIconColorOverride={shortcut.officialIconColorOverride}
          iconRendering={shortcut.iconRendering}
          iconColor={shortcut.iconColor}
          iconCornerRadius={iconCornerRadius}
          iconAppearance={iconAppearance}
          remoteIconScale={1}
        />
      </div>
    </div>
  );
}

function FolderPanelTitle({
  title,
  bindLayoutRef,
  allowEditing,
  draftTitle,
  titleInputRef,
  useReadableDarkText,
  onDraftTitleChange,
  onStartEditing,
  onCommit,
  onCancel,
}: {
  title: string;
  bindLayoutRef?: React.RefObject<HTMLDivElement | null>;
  allowEditing: boolean;
  draftTitle: string;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  useReadableDarkText: boolean;
  onDraftTitleChange: (value: string) => void;
  onStartEditing: () => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      ref={bindLayoutRef}
      className={FOLDER_TITLE_PADDING_CLASSNAME}
    >
      <div className="text-center">
        {allowEditing ? (
          <input
            ref={titleInputRef}
            data-testid="shortcut-folder-overlay-title-input"
            value={draftTitle}
            maxLength={24}
            onChange={(event) => onDraftTitleChange(event.target.value)}
            onBlur={onCommit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onCommit();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                onCancel();
              }
            }}
            className={`mx-auto block w-full max-w-[320px] border-0 bg-transparent px-0 text-center text-[22px] font-semibold tracking-[-0.02em] outline-none ${useReadableDarkText ? 'text-foreground placeholder:text-foreground/45' : 'text-white placeholder:text-white/45'}`}
            placeholder={title}
          />
        ) : (
          <button
            type="button"
            data-testid="shortcut-folder-overlay-title-button"
            className={`mx-auto block max-w-[320px] truncate border-0 bg-transparent px-0 text-center text-[22px] font-semibold tracking-[-0.02em] outline-none ${useReadableDarkText ? 'text-foreground' : 'text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.28)]'}`}
            onClick={onStartEditing}
          >
            {title}
          </button>
        )}
      </div>
    </div>
  );
}

export function ShortcutFolderCompactOverlay({
  shortcut,
  transitionPhase,
  transitionProgress,
  onOpenChange,
  openingSourceSnapshot,
  onOpeningLayoutReady,
  onClosingLayoutReady,
  rootGridColumns,
  compactIconSize = 72,
  iconCornerRadius = 22,
  iconAppearance,
  onRenameFolder,
  onShortcutOpen,
  onShortcutContextMenu,
  onShortcutDropIntent,
  onExtractDragStart,
  displayMode,
}: ShortcutFolderCompactOverlayProps) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const [metrics, setMetrics] = useState<OverlayMetrics | null>(null);
  const [committedMetrics, setCommittedMetrics] = useState<OverlayMetrics | null>(null);
  const [closingSourceSnapshot, setClosingSourceSnapshot] = useState<ShortcutFolderOpeningSourceSnapshot | null>(null);
  const [folderDragActive, setFolderDragActive] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [panelHeightPx, setPanelHeightPx] = useState<number | null>(null);
  const measureSurfaceRef = useRef<HTMLDivElement | null>(null);
  const measureTitleRef = useRef<HTMLDivElement | null>(null);
  const measureTitleTextRef = useRef<HTMLDivElement | null>(null);
  const measureScrollRef = useRef<HTMLDivElement | null>(null);
  const openSurfaceRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const openingReadyReportedRef = useRef(false);
  const closingReadyReportedRef = useRef(false);

  const children = useMemo(
    () => (shortcut && isShortcutFolder(shortcut) ? getShortcutChildren(shortcut) : []),
    [shortcut],
  );
  const useReadableDarkText = displayMode === 'panoramic' && resolvedTheme !== 'dark';
  const roundedCorner = `${FOLDER_PANEL_RADIUS_PX}px`;
  const maxPanelHeightPx = useMemo(() => {
    if (typeof window === 'undefined') return FOLDER_PANEL_MAX_HEIGHT_PX;
    return Math.min(FOLDER_PANEL_MAX_HEIGHT_PX, Math.floor(window.innerHeight * FOLDER_PANEL_MAX_VIEWPORT_RATIO));
  }, [shortcut?.id]);
  const predictedPanelWidthPx = useMemo(
    () => resolvePredictedPanelWidthPx(),
    [shortcut?.id],
  );

  const activeSourceSnapshot = transitionPhase === 'closing-measure' || transitionPhase === 'closing-animate'
    ? (closingSourceSnapshot ?? openingSourceSnapshot ?? null)
    : (openingSourceSnapshot ?? null);
  const sourceChildRects = useMemo(() => new Map(
    (activeSourceSnapshot?.sourceChildRects ?? []).map((entry) => [entry.childId, entry.rect] as const),
  ), [activeSourceSnapshot?.sourceChildRects]);
  const sourceChildSlotRects = activeSourceSnapshot?.sourceChildSlotRects ?? [];

  useLayoutEffect(() => {
    setMetrics(null);
    setCommittedMetrics(null);
    setClosingSourceSnapshot(null);
    setFolderDragActive(false);
    setEditingTitle(false);
    setPanelHeightPx(null);
    openingReadyReportedRef.current = false;
    closingReadyReportedRef.current = false;
  }, [shortcut?.id]);

  useLayoutEffect(() => {
    if (!shortcut) return;
    setDraftTitle(shortcut.title || '');
  }, [shortcut]);

  useEffect(() => {
    if (transitionPhase !== 'open' && transitionPhase !== 'closing-measure' && folderDragActive) {
      setFolderDragActive(false);
    }
  }, [folderDragActive, transitionPhase]);

  const updatePanelHeight = useCallback(() => {
    if (typeof window === 'undefined') return;
    const scrollRegion = measureScrollRef.current;
    const titleHeight = measureTitleRef.current?.offsetHeight ?? 0;
    const scrollHeight = scrollRegion?.scrollHeight ?? 0;
    if (titleHeight <= 0 && scrollHeight <= 0) return;

    const scrollRegionStyles = scrollRegion ? window.getComputedStyle(scrollRegion) : null;
    const paddingTop = scrollRegionStyles ? parseFloat(scrollRegionStyles.paddingTop || '0') : 0;
    const paddingBottom = scrollRegionStyles ? parseFloat(scrollRegionStyles.paddingBottom || '0') : 0;
    const fallbackGridItem = scrollRegion?.querySelector<HTMLElement>('[data-shortcut-drag-item="true"]');
    const gridNode = scrollRegion?.querySelector<HTMLElement>('[data-folder-shortcut-grid="true"]')
      ?? fallbackGridItem?.closest<HTMLElement>('.grid')
      ?? null;
    const gridStyles = gridNode ? window.getComputedStyle(gridNode) : null;
    const gridItem = gridNode?.querySelector<HTMLElement>('[data-folder-shortcut-grid-item="true"]')
      ?? fallbackGridItem
      ?? null;
    const rowGap = gridStyles ? parseFloat(gridStyles.rowGap || gridStyles.gap || '0') : 0;
    const columnCount = gridStyles?.gridTemplateColumns
      ? gridStyles.gridTemplateColumns.split(' ').filter(Boolean).length
      : 1;
    const gridAutoRows = gridStyles ? parseFloat(gridStyles.gridAutoRows || '0') : 0;
    const rowHeight = gridAutoRows > 0
      ? gridAutoRows
      : (gridItem?.getBoundingClientRect().height ?? 0);
    const totalRows = columnCount > 0 ? Math.ceil(children.length / columnCount) : 0;
    const availableScrollHeight = Math.max(0, maxPanelHeightPx - titleHeight);
    const maxRowsThatFitViewport = rowHeight > 0
      ? Math.max(
          1,
          Math.floor((availableScrollHeight - paddingTop - paddingBottom + rowGap) / Math.max(1, rowHeight + rowGap)),
        )
      : FOLDER_PANEL_MAX_VISIBLE_ROWS;
    const visibleRows = totalRows > 0
      ? Math.min(FOLDER_PANEL_MAX_VISIBLE_ROWS, totalRows, maxRowsThatFitViewport)
      : 0;
    const visibleScrollHeight = visibleRows > 0 && rowHeight > 0
      ? Math.ceil(
          paddingTop
          + paddingBottom
          + rowHeight * visibleRows
          + Math.max(0, visibleRows - 1) * rowGap,
        )
      : scrollHeight;
    const nextHeight = Math.min(
      maxPanelHeightPx,
      Math.ceil(titleHeight + Math.min(scrollHeight, visibleScrollHeight)),
    );
    setPanelHeightPx((current) => (current === nextHeight ? current : nextHeight));
  }, [children.length, maxPanelHeightPx]);

  const measureOverlayLayout = useCallback(() => {
    const surfaceNode = measureSurfaceRef.current;
    if (!surfaceNode) return null;
    const targetRect = copyRect(surfaceNode.getBoundingClientRect());
    if (!targetRect) return null;
    const targetTitleRect = copyRect(measureTitleTextRef.current?.getBoundingClientRect());
    const { childRects: targetChildRects, childLabelRects: targetChildLabelRects } = measureTargetChildRects(surfaceNode, children);
    const nextMetrics = {
      targetRect,
      targetTitleRect,
      targetChildRects,
      targetChildLabelRects,
    };

    setMetrics((current) => {
      if (
        current
        && rectEquals(current.targetRect, nextMetrics.targetRect)
        && rectEquals(current.targetTitleRect, nextMetrics.targetTitleRect)
        && mapsEqual(current.targetChildRects, nextMetrics.targetChildRects)
        && mapsEqual(current.targetChildLabelRects, nextMetrics.targetChildLabelRects)
      ) {
        return current;
      }
      return nextMetrics;
    });

    return nextMetrics;
  }, [children]);

  const measureClosingSourceSnapshot = useCallback(() => {
    if (!shortcut) return null;

    const sourcePreview = getFolderPreviewRoot(shortcut.id);
    const sourceRect = copyRect(sourcePreview?.getBoundingClientRect());
    if (!sourceRect) return null;

    const previewSlots = getFolderPreviewSlotEntries(shortcut.id);
    const nextSourceChildSlotRects: OverlayRect[] = [];
    const nextSourceChildRects: ShortcutFolderOpeningSourceSnapshot['sourceChildRects'] = [];

    previewSlots.forEach((slot) => {
      const rect = copyRect(slot.element.getBoundingClientRect());
      if (!rect) return;
      nextSourceChildSlotRects[slot.index] = rect;
      nextSourceChildRects.push({
        childId: slot.childId,
        rect,
      });
    });

    return {
      folderId: shortcut.id,
      sourceRect,
      sourceBorderRadius: readElementBorderRadiusPx(sourcePreview),
      sourceTitleRect: copyRect(getFolderPreviewTitle(shortcut.id)?.getBoundingClientRect()),
      sourceChildRects: nextSourceChildRects,
      sourceChildSlotRects: nextSourceChildSlotRects.filter(Boolean),
    };
  }, [shortcut]);

  const resolvedMetrics = committedMetrics ?? metrics;
  const layoutPhaseActive = transitionPhase === 'opening-measure'
    || transitionPhase === 'open'
    || transitionPhase === 'closing-measure';

  useLayoutEffect(() => {
    if (!shortcut || !layoutPhaseActive) return;
    updatePanelHeight();
    measureOverlayLayout();
  }, [layoutPhaseActive, measureOverlayLayout, panelHeightPx, shortcut, updatePanelHeight]);

  useLayoutEffect(() => {
    if (transitionPhase !== 'closing-measure') return;
    const nextSnapshot = measureClosingSourceSnapshot();
    if (!nextSnapshot) return;
    setClosingSourceSnapshot(nextSnapshot);
  }, [measureClosingSourceSnapshot, transitionPhase]);

  useEffect(() => {
    if (!shortcut || typeof window === 'undefined' || !layoutPhaseActive) return undefined;

    const handleRefresh = () => {
      updatePanelHeight();
      measureOverlayLayout();
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' && measureSurfaceRef.current
      ? new ResizeObserver(() => {
          handleRefresh();
        })
      : null;

    if (measureSurfaceRef.current && resizeObserver) {
      resizeObserver.observe(measureSurfaceRef.current);
    }

    window.addEventListener('resize', handleRefresh, { passive: true });
    window.addEventListener('scroll', handleRefresh, { passive: true, capture: true });
    measureScrollRef.current?.addEventListener('scroll', handleRefresh, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleRefresh);
      window.removeEventListener('scroll', handleRefresh, true);
      measureScrollRef.current?.removeEventListener('scroll', handleRefresh);
    };
  }, [layoutPhaseActive, measureOverlayLayout, shortcut, updatePanelHeight]);

  useEffect(() => {
    if (transitionPhase !== 'opening-measure') {
      openingReadyReportedRef.current = false;
    }
    if (transitionPhase !== 'closing-measure') {
      closingReadyReportedRef.current = false;
    }
  }, [transitionPhase]);

  useLayoutEffect(() => {
    if (!shortcut || !metrics) return;
    if (transitionPhase === 'opening-measure' && !openingReadyReportedRef.current) {
      setCommittedMetrics(metrics);
      openingReadyReportedRef.current = true;
      onOpeningLayoutReady?.();
    }
    if (transitionPhase === 'closing-measure' && !closingReadyReportedRef.current) {
      closingReadyReportedRef.current = true;
      onClosingLayoutReady?.();
    }
  }, [metrics, onClosingLayoutReady, onOpeningLayoutReady, shortcut, transitionPhase]);

  useEffect(() => {
    if (!shortcut || !editingTitle || transitionPhase !== 'open') return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [editingTitle, shortcut, transitionPhase]);

  useEffect(() => {
    if (!shortcut) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenChange, shortcut]);

  const commitTitle = useCallback(() => {
    if (!shortcut) return;
    const nextName = draftTitle.trim();
    setEditingTitle(false);
    if (!nextName || nextName === shortcut.title) {
      setDraftTitle(shortcut.title || '');
      return;
    }
    onRenameFolder(shortcut.id, nextName);
  }, [draftTitle, onRenameFolder, shortcut]);

  const cancelTitleEdit = useCallback(() => {
    setDraftTitle(shortcut?.title || '');
    setEditingTitle(false);
  }, [shortcut?.title]);

  if (!shortcut || typeof document === 'undefined') {
    return null;
  }

  const openProgress = clamp01(transitionProgress);
  const motionPhase = transitionPhase === 'closing-measure' || transitionPhase === 'closing-animate'
    ? 'closing'
    : 'opening';
  const chromeProgress = resolveChromeAnimationProgress(openProgress, motionPhase);
  const chromeTranslateY = mix(10, 0, chromeProgress);
  const sourceRect = activeSourceSnapshot?.sourceRect
    ?? (resolvedMetrics ? getFallbackSourceRect(resolvedMetrics.targetRect) : null);
  const sourceBorderRadius = Math.max(
    0,
    activeSourceSnapshot?.sourceBorderRadius
      ?? (sourceRect ? Math.min(sourceRect.width, sourceRect.height) * 0.28 : FOLDER_PANEL_RADIUS_PX),
  );
  const shellReady = Boolean(resolvedMetrics && sourceRect);
  const showAnimationLayer = Boolean(resolvedMetrics && sourceRect && (
    transitionPhase === 'opening-animate' || transitionPhase === 'closing-animate'
  ));
  const showSettledLayer = Boolean(resolvedMetrics && (
    transitionPhase === 'open' || transitionPhase === 'closing-measure'
  ));
  const targetFrameStyle = resolvedMetrics
    ? {
        left: resolvedMetrics.targetRect.left,
        top: resolvedMetrics.targetRect.top,
        width: resolvedMetrics.targetRect.width,
        height: resolvedMetrics.targetRect.height,
      }
    : null;
  const animatedPanelRect = showAnimationLayer && resolvedMetrics && sourceRect
    ? interpolateRect(sourceRect, resolvedMetrics.targetRect, openProgress)
    : null;
  const animatedPanelBorderRadius = mix(sourceBorderRadius, FOLDER_PANEL_RADIUS_PX, openProgress);
  const shellVisibility = resolveFolderShellVisibility(openProgress);

  const folderTitle = shortcut.title || t('context.folder', { defaultValue: '文件夹' });
  const sourceTitleRect = activeSourceSnapshot?.sourceTitleRect
    ?? (sourceRect ? getFallbackSourceTitleRect({ sourceRect, title: folderTitle }) : null);
  const targetTitleRect = resolvedMetrics?.targetTitleRect ?? null;
  const titleProgress = chromeProgress;
  const animatedTitleRect = showAnimationLayer && sourceTitleRect && targetTitleRect
    ? interpolateRect(sourceTitleRect, targetTitleRect, titleProgress)
    : null;

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: OVERLAY_Z_INDEX }}>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          opacity: 0,
          backgroundColor: 'transparent',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          pointerEvents: 'none',
        }}
      />

      <button
        type="button"
        aria-label={t('common.close', { defaultValue: '关闭' })}
        className="absolute inset-0 appearance-none rounded-none border-0 bg-transparent p-0"
        style={{
          pointerEvents: shellReady && (transitionPhase !== 'opening-measure' || openProgress > 0.02) ? 'auto' : 'none',
          WebkitAppearance: 'none',
          appearance: 'none',
        }}
        onClick={() => onOpenChange(false)}
      />

      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div
          ref={measureSurfaceRef}
          className={`relative overflow-hidden ${PANEL_WIDTH_CLASSNAME}`}
          style={{
            borderRadius: roundedCorner,
            height: panelHeightPx ? `${panelHeightPx}px` : undefined,
            maxHeight: `${maxPanelHeightPx}px`,
            visibility: 'hidden',
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={buildFolderPanelSurfaceStyle(roundedCorner)}
          />
          <div className="relative flex h-full flex-col">
            <div
              ref={measureTitleRef}
              className={FOLDER_TITLE_PADDING_CLASSNAME}
            >
              <div
                ref={measureTitleTextRef}
                className={`mx-auto block max-w-[320px] truncate text-center text-[22px] font-semibold tracking-[-0.02em] ${useReadableDarkText ? 'text-foreground' : 'text-white'}`}
              >
                {folderTitle}
              </div>
            </div>
            <div
              ref={measureScrollRef}
              data-folder-overlay-scroll-region="true"
              className={FOLDER_SCROLL_REGION_CLASSNAME}
            >
              <FolderShortcutSurface
                folderId={shortcut.id}
                shortcuts={children}
                emptyText={t('context.folderEmpty', { defaultValue: '这个文件夹里还没有快捷方式' })}
                initialWidthPx={predictedPanelWidthPx}
                rootGridColumns={rootGridColumns}
                compactIconSize={compactIconSize}
                iconCornerRadius={iconCornerRadius}
                iconAppearance={iconAppearance}
                forceTextWhite={!useReadableDarkText}
                showShortcutTitles
                animateShortcutTitlesOnMount={false}
                maskBoundaryRef={measureSurfaceRef}
                onShortcutOpen={onShortcutOpen}
                onShortcutContextMenu={(event, childShortcut) => onShortcutContextMenu(event, shortcut.id, childShortcut)}
                onShortcutDropIntent={onShortcutDropIntent}
              />
            </div>
          </div>
        </div>
      </div>

      {showAnimationLayer && animatedPanelRect ? (
        <div className="pointer-events-none fixed inset-0">
          <div
            className="absolute overflow-hidden"
            style={{
              left: animatedPanelRect.left,
              top: animatedPanelRect.top,
              width: animatedPanelRect.width,
              height: animatedPanelRect.height,
              ...buildFolderPanelSurfaceStyle(`${animatedPanelBorderRadius}px`, shellVisibility),
              backgroundImage: 'none',
              border: '1px solid transparent',
              boxShadow: 'none',
              zIndex: OVERLAY_Z_INDEX + 3,
              willChange: 'left, top, width, height, border-radius',
            }}
          />

          {animatedTitleRect && titleProgress > 0.001 ? (
            <div
              className="fixed pointer-events-none flex items-center justify-center"
              style={{
                left: animatedTitleRect.left,
                top: animatedTitleRect.top,
                width: animatedTitleRect.width,
                height: animatedTitleRect.height,
                zIndex: OVERLAY_Z_INDEX + 7,
                opacity: titleProgress,
                willChange: 'left, top, width, height, opacity',
              }}
            >
              <div
                className={`truncate text-center font-semibold tracking-[-0.02em] ${useReadableDarkText ? 'text-foreground' : 'text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.28)]'}`}
                style={{
                  width: '100%',
                  fontSize: `${mix(FOLDER_PREVIEW_TITLE_FONT_SIZE_PX, FOLDER_PANEL_TITLE_FONT_SIZE_PX, titleProgress)}px`,
                  lineHeight: 1.15,
                  transform: `translate3d(0, ${chromeTranslateY}px, 0)`,
                }}
              >
                {folderTitle}
              </div>
            </div>
          ) : null}

          {resolvedMetrics ? children.map((child, index) => {
            const targetRect = resolvedMetrics.targetChildRects.get(child.id);
            if (!targetRect || !sourceRect) return null;
            const targetLabelRect = resolvedMetrics.targetChildLabelRects.get(child.id) ?? null;

            const collapsedPreviewVisible = sourceChildRects.has(child.id) || index < sourceChildSlotRects.length;
            const sourceChildRect = sourceChildRects.get(child.id)
              ?? sourceChildSlotRects[index]
              ?? getVirtualCollapsedChildRect({
                sourceRect,
                index,
                total: children.length,
              });
            const childProgress = resolveChildAnimationProgress(openProgress, index, motionPhase);
            const animatedChildRect = interpolateRect(sourceChildRect, targetRect, childProgress);
            const opacity = resolveAnimatedChildOpacity({
              childProgress,
              motionPhase,
              collapsedPreviewVisible,
            });
            const labelProgress = motionPhase === 'opening'
              ? clamp01((childProgress - 0.12) / 0.88)
              : clamp01((childProgress - 0.06) / 0.94);
            const animatedLabelRect = targetLabelRect
              ? interpolateRect(
                  getVirtualChildLabelStartRect({
                    sourceChildRect,
                    targetChildRect: targetRect,
                    targetLabelRect,
                  }),
                  targetLabelRect,
                  labelProgress,
                )
              : null;
            const labelOpacity = resolveAnimatedChildLabelOpacity(labelProgress, motionPhase);

            return (
              <div key={child.id}>
                <div
                  className="fixed pointer-events-none"
                  style={{
                    left: animatedChildRect.left,
                    top: animatedChildRect.top,
                    width: animatedChildRect.width,
                    height: animatedChildRect.height,
                    zIndex: OVERLAY_Z_INDEX + 6,
                    opacity,
                    willChange: 'left, top, width, height, opacity',
                  }}
                >
                  <GhostShortcutIcon
                    shortcut={child}
                    width={animatedChildRect.width}
                    height={animatedChildRect.height}
                    iconCornerRadius={iconCornerRadius}
                    iconAppearance={iconAppearance}
                  />
                </div>
                {animatedLabelRect && labelOpacity > 0.001 ? (
                  <div
                    className="fixed pointer-events-none flex items-center justify-center"
                    style={{
                      left: animatedLabelRect.left,
                      top: animatedLabelRect.top,
                      width: animatedLabelRect.width,
                      height: animatedLabelRect.height,
                      zIndex: OVERLAY_Z_INDEX + 7,
                      opacity: labelOpacity,
                      willChange: 'left, top, width, height, opacity',
                    }}
                  >
                    <div
                      className={`truncate text-center leading-4 ${useReadableDarkText ? 'text-foreground' : 'text-white'}`}
                      style={{
                        width: '100%',
                        fontSize: `${FOLDER_CHILD_LABEL_FONT_SIZE_PX}px`,
                      }}
                    >
                      {child.title}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          }) : null}
        </div>
      ) : null}

      {showSettledLayer && targetFrameStyle ? (
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute" style={{ ...targetFrameStyle, zIndex: OVERLAY_Z_INDEX + 4 }}>
            <div
              ref={openSurfaceRef}
              data-testid="shortcut-folder-overlay"
              data-folder-id={shortcut.id}
              className="pointer-events-auto relative h-full w-full overflow-hidden"
              style={{ borderRadius: roundedCorner }}
              onClick={(event) => {
                if (folderDragActive || !shouldCloseFolderFromOverlaySurfaceClick(event.target)) {
                  event.stopPropagation();
                  return;
                }

                event.stopPropagation();
                onOpenChange(false);
              }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={buildFolderPanelSurfaceStyle(roundedCorner)}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  borderRadius: roundedCorner,
                  backgroundColor: 'rgba(15, 18, 24, 0)',
                  border: folderDragActive ? '2.5px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0)',
                  boxShadow: folderDragActive ? 'inset 0 0 0 1px rgba(255,255,255,0.05)' : undefined,
                  opacity: folderDragActive ? 1 : 0,
                  transition: 'opacity 120ms ease-out, border-color 120ms ease-out, box-shadow 120ms ease-out',
                  pointerEvents: 'none',
                }}
              />
              <div className="relative flex h-full flex-col">
                {transitionPhase === 'open' && editingTitle ? (
                  <FolderPanelTitle
                    title={folderTitle}
                    allowEditing
                    draftTitle={draftTitle}
                    titleInputRef={titleInputRef}
                    useReadableDarkText={useReadableDarkText}
                    onDraftTitleChange={setDraftTitle}
                    onStartEditing={() => {}}
                    onCommit={commitTitle}
                    onCancel={cancelTitleEdit}
                  />
                ) : (
                  <div className={FOLDER_TITLE_PADDING_CLASSNAME}>
                    <div className="text-center">
                      {transitionPhase === 'open' ? (
                        <button
                          type="button"
                          className={`mx-auto block max-w-[320px] truncate border-0 bg-transparent px-0 text-center text-[22px] font-semibold tracking-[-0.02em] outline-none ${useReadableDarkText ? 'text-foreground' : 'text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.28)]'}`}
                          onClick={() => setEditingTitle(true)}
                        >
                          {folderTitle}
                        </button>
                      ) : (
                        <div className={`mx-auto block max-w-[320px] truncate text-center text-[22px] font-semibold tracking-[-0.02em] ${useReadableDarkText ? 'text-foreground' : 'text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.28)]'}`}>
                          {folderTitle}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div
                  className={FOLDER_SCROLL_REGION_CLASSNAME}
                >
                  <FolderShortcutSurface
                    folderId={shortcut.id}
                    shortcuts={children}
                    emptyText={t('context.folderEmpty', { defaultValue: '这个文件夹里还没有快捷方式' })}
                    initialWidthPx={predictedPanelWidthPx}
                    rootGridColumns={rootGridColumns}
                    compactIconSize={compactIconSize}
                    iconCornerRadius={iconCornerRadius}
                    iconAppearance={iconAppearance}
                    forceTextWhite={!useReadableDarkText}
                    showShortcutTitles={transitionPhase === 'open' || transitionPhase === 'closing-measure'}
                    animateShortcutTitlesOnMount={false}
                    maskBoundaryRef={openSurfaceRef}
                    onShortcutOpen={onShortcutOpen}
                    onShortcutContextMenu={(event, childShortcut) => onShortcutContextMenu(event, shortcut.id, childShortcut)}
                    onShortcutDropIntent={onShortcutDropIntent}
                    onExtractDragStart={transitionPhase === 'open' ? onExtractDragStart : undefined}
                    onDragActiveChange={transitionPhase === 'open' ? setFolderDragActive : undefined}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
