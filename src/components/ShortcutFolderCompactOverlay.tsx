import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { FolderShortcutDropIntent } from '@leaftab/workspace-core';
import ShortcutIcon from '@/components/ShortcutIcon';
import {
  FOLDER_LABEL_REVEAL_START_PROGRESS,
  clamp01,
  interpolateRect,
  mix,
  resolveBackdropAnimationProgress,
  resolveChildAnimationProgress,
  resolveChromeAnimationProgress,
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
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import { getShortcutChildren, isShortcutFolder } from '@/utils/shortcutFolders';

type ShortcutFolderCompactOverlayProps = {
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
};

type OverlayRect = ShortcutFolderOverlayRect;

type OverlayMetrics = {
  targetRect: OverlayRect;
  targetChildRects: Map<string, OverlayRect>;
};

const OVERLAY_Z_INDEX = 16000;
const FOLDER_PANEL_RADIUS_PX = 32;
const FOLDER_PANEL_MAX_VIEWPORT_RATIO = 0.78;
const FOLDER_PANEL_MAX_HEIGHT_PX = 680;
const FOLDER_PANEL_MAX_VISIBLE_ROWS = 5;
const HIDDEN_CHILD_OPENING_COLLAPSED_OPACITY = 0.32;
const COLLAPSED_CHILD_CONTENT_RATIO = 0.94;
const GHOST_ICON_BASE_SIZE = 72;
const PANEL_WIDTH_CLASSNAME = 'w-[min(720px,calc(100vw-24px))] max-w-[720px]';
const PANEL_HORIZONTAL_MARGIN_PX = 24;
const PANEL_MAX_WIDTH_PX = 720;

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

function resolvePredictedPanelWidthPx() {
  if (typeof window === 'undefined') return PANEL_MAX_WIDTH_PX;
  return Math.max(320, Math.min(PANEL_MAX_WIDTH_PX, window.innerWidth - PANEL_HORIZONTAL_MARGIN_PX));
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

function measureTargetChildRects(container: ParentNode | null | undefined, shortcuts: Shortcut[]) {
  const childRects = new Map<string, OverlayRect>();

  shortcuts.forEach((child) => {
    const escapedChildId = escapeSelectorValue(child.id);
    const childNode = container?.querySelector<HTMLElement>(`[data-folder-overlay-child-id="${escapedChildId}"]`);
    const childRect = copyRect(childNode?.getBoundingClientRect());
    if (childRect) {
      childRects.set(child.id, childRect);
    }
  });

  return childRects;
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
  onDraftTitleChange: (value: string) => void;
  onStartEditing: () => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      ref={bindLayoutRef}
      className="px-6 pb-4 pt-6"
    >
      <div className="text-center">
        {allowEditing ? (
          <input
            ref={titleInputRef}
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
            className="mx-auto block w-full max-w-[320px] border-0 bg-transparent px-0 text-center text-[22px] font-semibold tracking-[-0.02em] text-white outline-none placeholder:text-white/45"
            placeholder={title}
          />
        ) : (
          <button
            type="button"
            className="mx-auto block max-w-[320px] truncate border-0 bg-transparent px-0 text-center text-[22px] font-semibold tracking-[-0.02em] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.28)] outline-none"
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
}: ShortcutFolderCompactOverlayProps) {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<OverlayMetrics | null>(null);
  const [folderDragActive, setFolderDragActive] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [panelHeightPx, setPanelHeightPx] = useState<number | null>(null);
  const measureSurfaceRef = useRef<HTMLDivElement | null>(null);
  const measureTitleRef = useRef<HTMLDivElement | null>(null);
  const measureScrollRef = useRef<HTMLDivElement | null>(null);
  const openSurfaceRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const openingReadyReportedRef = useRef(false);
  const closingReadyReportedRef = useRef(false);

  const children = useMemo(
    () => (shortcut && isShortcutFolder(shortcut) ? getShortcutChildren(shortcut) : []),
    [shortcut],
  );
  const roundedCorner = `${FOLDER_PANEL_RADIUS_PX}px`;
  const maxPanelHeightPx = useMemo(() => {
    if (typeof window === 'undefined') return FOLDER_PANEL_MAX_HEIGHT_PX;
    return Math.min(FOLDER_PANEL_MAX_HEIGHT_PX, Math.floor(window.innerHeight * FOLDER_PANEL_MAX_VIEWPORT_RATIO));
  }, [shortcut?.id]);
  const predictedPanelWidthPx = useMemo(
    () => resolvePredictedPanelWidthPx(),
    [shortcut?.id],
  );

  const sourceChildRects = useMemo(() => new Map(
    (openingSourceSnapshot?.sourceChildRects ?? []).map((entry) => [entry.childId, entry.rect] as const),
  ), [openingSourceSnapshot?.sourceChildRects]);
  const sourceChildSlotRects = openingSourceSnapshot?.sourceChildSlotRects ?? [];

  useLayoutEffect(() => {
    setMetrics(null);
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
    const rowHeight = gridItem?.getBoundingClientRect().height ?? 0;
    const totalRows = columnCount > 0 ? Math.ceil(children.length / columnCount) : 0;
    const visibleRows = totalRows > 0 ? Math.min(FOLDER_PANEL_MAX_VISIBLE_ROWS, totalRows) : 0;
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
    const targetChildRects = measureTargetChildRects(surfaceNode, children);
    const nextMetrics = { targetRect, targetChildRects };

    setMetrics((current) => {
      if (
        current
        && rectEquals(current.targetRect, nextMetrics.targetRect)
        && mapsEqual(current.targetChildRects, nextMetrics.targetChildRects)
      ) {
        return current;
      }
      return nextMetrics;
    });

    return nextMetrics;
  }, [children]);

  const layoutPhaseActive = transitionPhase !== 'idle';

  useLayoutEffect(() => {
    if (!shortcut || !layoutPhaseActive) return;
    updatePanelHeight();
    measureOverlayLayout();
  }, [layoutPhaseActive, measureOverlayLayout, panelHeightPx, shortcut, updatePanelHeight]);

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
  const backdropProgress = resolveBackdropAnimationProgress(openProgress);
  const backdropBlurPx = mix(0, 24, backdropProgress);
  const chromeProgress = resolveChromeAnimationProgress(openProgress);
  const chromeTranslateY = mix(10, 0, chromeProgress);
  const sourceRect = openingSourceSnapshot?.sourceRect
    ?? (metrics ? getFallbackSourceRect(metrics.targetRect) : null);
  const sourceBorderRadius = Math.max(
    0,
    openingSourceSnapshot?.sourceBorderRadius
      ?? (sourceRect ? Math.min(sourceRect.width, sourceRect.height) * 0.28 : FOLDER_PANEL_RADIUS_PX),
  );
  const shellReady = Boolean(metrics && sourceRect);
  const showAnimationLayer = Boolean(metrics && sourceRect && (
    transitionPhase === 'opening-animate' || transitionPhase === 'closing-animate'
  ));
  const showSettledLayer = Boolean(metrics && (
    transitionPhase === 'open' || transitionPhase === 'closing-measure'
  ));
  const targetFrameStyle = metrics
    ? {
        left: metrics.targetRect.left,
        top: metrics.targetRect.top,
        width: metrics.targetRect.width,
        height: metrics.targetRect.height,
      }
    : null;
  const animatedPanelRect = showAnimationLayer && metrics && sourceRect
    ? interpolateRect(sourceRect, metrics.targetRect, openProgress)
    : null;
  const animatedPanelBorderRadius = mix(sourceBorderRadius, FOLDER_PANEL_RADIUS_PX, openProgress);
  const animationShortcutTitlesVisible = openProgress >= FOLDER_LABEL_REVEAL_START_PROGRESS;
  const shellShadowAlpha = mix(0.08, 0.16, openProgress);
  const shellBorderAlpha = mix(0.16, 0.12, openProgress);
  const shellFillTopAlpha = mix(0.22, 0.12, openProgress);
  const shellFillBottomAlpha = mix(0.12, 0.05, openProgress);

  const folderTitle = shortcut.title || t('context.folder', { defaultValue: '文件夹' });

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: OVERLAY_Z_INDEX }}>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          opacity: backdropProgress,
          backgroundColor: 'transparent',
          backdropFilter: `blur(${backdropBlurPx}px)`,
          WebkitBackdropFilter: `blur(${backdropBlurPx}px)`,
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
          className={`relative overflow-visible ${PANEL_WIDTH_CLASSNAME}`}
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
            style={{
              borderRadius: roundedCorner,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
            }}
          />
          <div className="relative flex h-full flex-col">
            <div
              ref={measureTitleRef}
              className="px-6 pb-4 pt-6"
            >
              <div className="mx-auto block max-w-[320px] truncate text-center text-[22px] font-semibold tracking-[-0.02em] text-white">
                {folderTitle}
              </div>
            </div>
            <div
              ref={measureScrollRef}
              data-folder-overlay-scroll-region="true"
              className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
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
                forceTextWhite
                showShortcutTitles
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
              borderRadius: `${animatedPanelBorderRadius}px`,
              background: `linear-gradient(180deg, rgba(255,255,255,${shellFillTopAlpha}), rgba(255,255,255,${shellFillBottomAlpha}))`,
              border: `1px solid rgba(255,255,255,${shellBorderAlpha})`,
              boxShadow: `0 24px 64px rgba(0,0,0,${shellShadowAlpha})`,
              zIndex: OVERLAY_Z_INDEX + 3,
              willChange: 'left, top, width, height, border-radius',
            }}
          >
            {chromeProgress > 0.001 ? (
              <div
                className="absolute inset-x-0 top-0 px-6 pb-4 pt-6 text-center"
                style={{
                  opacity: chromeProgress,
                  transform: `translate3d(0, ${chromeTranslateY}px, 0)`,
                  willChange: 'opacity, transform',
                }}
              >
                <div className="mx-auto block max-w-[320px] truncate text-center text-[22px] font-semibold tracking-[-0.02em] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.28)]">
                  {folderTitle}
                </div>
              </div>
            ) : null}
          </div>

          {metrics ? children.map((child, index) => {
            const targetRect = metrics.targetChildRects.get(child.id);
            if (!targetRect || !sourceRect) return null;

            const sourceChildRect = sourceChildRects.get(child.id)
              ?? sourceChildSlotRects[index]
              ?? getVirtualCollapsedChildRect({
                sourceRect,
                index,
                total: children.length,
              });
            const childProgress = resolveChildAnimationProgress(openProgress, index);
            const animatedChildRect = interpolateRect(sourceChildRect, targetRect, childProgress);
            const opacity = mix(
              sourceChildRects.has(child.id) || index < sourceChildSlotRects.length
                ? 1
                : HIDDEN_CHILD_OPENING_COLLAPSED_OPACITY,
              1,
              childProgress,
            );

            return (
              <div
                key={child.id}
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
            );
          }) : null}
        </div>
      ) : null}

      {showSettledLayer && targetFrameStyle ? (
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute" style={{ ...targetFrameStyle, zIndex: OVERLAY_Z_INDEX + 4 }}>
            <div
              ref={openSurfaceRef}
              className="pointer-events-auto relative h-full w-full overflow-visible"
              style={{ borderRadius: roundedCorner }}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  borderRadius: roundedCorner,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
                }}
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
                    onDraftTitleChange={setDraftTitle}
                    onStartEditing={() => {}}
                    onCommit={commitTitle}
                    onCancel={cancelTitleEdit}
                  />
                ) : (
                  <div className="px-6 pb-4 pt-6">
                    <div className="text-center">
                      {transitionPhase === 'open' ? (
                        <button
                          type="button"
                          className="mx-auto block max-w-[320px] truncate border-0 bg-transparent px-0 text-center text-[22px] font-semibold tracking-[-0.02em] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.28)] outline-none"
                          onClick={() => setEditingTitle(true)}
                        >
                          {folderTitle}
                        </button>
                      ) : (
                        <div className="mx-auto block max-w-[320px] truncate text-center text-[22px] font-semibold tracking-[-0.02em] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.28)]">
                          {folderTitle}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div
                  className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
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
                    forceTextWhite
                    showShortcutTitles={transitionPhase === 'open' || animationShortcutTitlesVisible}
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
