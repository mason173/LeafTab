import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  FOLDER_LABEL_REVEAL_START_PROGRESS,
  FOLDER_SOURCE_PREVIEW_HIDDEN_SCALE,
  buildInterpolatedRectTransform,
  clamp01,
  easeOutCubic,
  mix,
  resolveBackdropAnimationProgress,
  resolveChildAnimationProgress,
  resolveChromeAnimationProgress,
  resolveInterruptibleAnimationDuration,
  resolveSourcePreviewCloseRevealProgress,
  resolveSourcePreviewHiddenProgress,
} from '@/components/shortcutFolderCompactAnimation';
import {
  FolderShortcutSurface,
  type FolderExtractDragStartPayload,
} from '@/features/shortcuts/components/FolderShortcutSurface';
import type { FolderShortcutDropIntent } from '@/features/shortcuts/drag/types';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import { getShortcutChildren, isShortcutFolder } from '@/utils/shortcutFolders';

type ShortcutFolderCompactOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcut: Shortcut | null;
  compactIconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  onRenameFolder: (folderId: string, name: string) => void;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu: (event: React.MouseEvent<HTMLDivElement>, folderId: string, shortcut: Shortcut) => void;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
};

type OverlayRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type OverlayMetrics = {
  sourceRect: OverlayRect;
  targetRect: OverlayRect;
  sourceChildRects: Map<string, OverlayRect>;
  sourceChildSlotRects: OverlayRect[];
  targetChildRects: Map<string, OverlayRect>;
};

type AnimatedNodeStyleSnapshot = {
  position: string;
  left: string;
  top: string;
  right: string;
  bottom: string;
  width: string;
  height: string;
  margin: string;
  transform: string;
  transformOrigin: string;
  transition: string;
  transitionDelay: string;
  opacity: string;
  willChange: string;
  zIndex: string;
  pointerEvents: string;
};

const OVERLAY_Z_INDEX = 16000;
const FOLDER_PANEL_RADIUS_PX = 32;
const FOLDER_PANEL_MAX_VIEWPORT_RATIO = 0.78;
const FOLDER_PANEL_MAX_HEIGHT_PX = 680;
const FOLDER_PANEL_MAX_VISIBLE_ROWS = 5;
const HIDDEN_CHILD_OPENING_COLLAPSED_OPACITY = 0.34;
const COLLAPSED_CHILD_CONTENT_RATIO = 0.94;

function copyRect(rect: DOMRect | OverlayRect | null | undefined): OverlayRect | null {
  if (!rect) return null;
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
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

function escapeSelectorValue(value: string): string {
  if (typeof window !== 'undefined' && window.CSS?.escape) {
    return window.CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}

function rectIntersectsVertically(rect: OverlayRect, viewportRect: OverlayRect, margin = 0): boolean {
  const rectBottom = rect.top + rect.height;
  const viewportBottom = viewportRect.top + viewportRect.height;
  return rectBottom > viewportRect.top - margin && rect.top < viewportBottom + margin;
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
  const rowWidth = Math.min(columns, total - row * columns) * tileSize + Math.max(0, Math.min(columns, total - row * columns) - 1) * gap;
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

function measureTargetChildRects(container: ParentNode | null | undefined, shortcuts: Shortcut[]): Map<string, OverlayRect> {
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

function findTargetChildNode(container: ParentNode | null | undefined, childId: string): HTMLElement | null {
  const escapedChildId = escapeSelectorValue(childId);
  return container?.querySelector<HTMLElement>(`[data-folder-overlay-child-id="${escapedChildId}"]`) ?? null;
}

function measureSourcePreviewMetrics(params: {
  folderId: string;
  fallbackTargetRect: OverlayRect;
  shortcuts: Shortcut[];
}): {
  sourceRect: OverlayRect;
  sourceChildRects: Map<string, OverlayRect>;
  sourceChildSlotRects: OverlayRect[];
} {
  const { folderId, fallbackTargetRect, shortcuts } = params;
  const escapedFolderId = escapeSelectorValue(folderId);
  const sourcePreview = document.querySelector<HTMLElement>(`[data-folder-preview-id="${escapedFolderId}"]`);
  const sourceChildRects = new Map<string, OverlayRect>();
  const sourceChildSlotRects: OverlayRect[] = [];
  let sourceRect = copyRect(sourcePreview?.getBoundingClientRect()) ?? getFallbackSourceRect(fallbackTargetRect);

  if (sourcePreview) {
    const sourcePreviewTransform = sourcePreview.style.transform;
    const sourcePreviewTransition = sourcePreview.style.transition;
    const sourcePreviewWillChange = sourcePreview.style.willChange;

    sourcePreview.style.transform = 'none';
    sourcePreview.style.transition = 'none';
    sourcePreview.style.willChange = 'auto';

    try {
      sourceRect = copyRect(sourcePreview.getBoundingClientRect()) ?? getFallbackSourceRect(fallbackTargetRect);

      Array.from(
        document.querySelectorAll<HTMLElement>(`[data-folder-preview-parent-id="${escapedFolderId}"][data-folder-preview-index]`),
      )
        .sort((left, right) => {
          const leftIndex = Number(left.dataset.folderPreviewIndex ?? '0');
          const rightIndex = Number(right.dataset.folderPreviewIndex ?? '0');
          return leftIndex - rightIndex;
        })
        .forEach((slotNode) => {
          const slotIndex = Number(slotNode.dataset.folderPreviewIndex ?? '-1');
          const slotRect = copyRect(slotNode.getBoundingClientRect());
          if (slotIndex >= 0 && slotRect) {
            sourceChildSlotRects[slotIndex] = slotRect;
          }
        });

      shortcuts.forEach((child) => {
        const escapedChildId = escapeSelectorValue(child.id);
        const childNode = document.querySelector<HTMLElement>(
          `[data-folder-preview-parent-id="${escapedFolderId}"][data-folder-preview-child-id="${escapedChildId}"]`,
        );
        const childRect = copyRect(childNode?.getBoundingClientRect());
        if (childRect) {
          sourceChildRects.set(child.id, childRect);
        }
      });
    } finally {
      sourcePreview.style.transform = sourcePreviewTransform;
      sourcePreview.style.transition = sourcePreviewTransition;
      sourcePreview.style.willChange = sourcePreviewWillChange;
    }
  }

  return {
    sourceRect,
    sourceChildRects,
    sourceChildSlotRects,
  };
}

function resolveSourcePreviewSlotRect(metrics: OverlayMetrics, slotIndex: number): OverlayRect {
  return metrics.sourceChildSlotRects[slotIndex]
    ?? getVirtualCollapsedChildRect({
      sourceRect: metrics.sourceRect,
      index: slotIndex,
      total: 4,
    });
}

export function ShortcutFolderCompactOverlay({
  open,
  onOpenChange,
  shortcut,
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
  const shortcutId = shortcut?.id ?? null;
  const [mountedShortcut, setMountedShortcut] = useState<Shortcut | null>(open ? shortcut : null);
  const [metrics, setMetrics] = useState<OverlayMetrics | null>(null);
  const [transitionState, setTransitionState] = useState<'opening' | 'closing' | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [folderDragActive, setFolderDragActive] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [panelHeightPx, setPanelHeightPx] = useState<number | null>(null);
  const titleSectionRef = useRef<HTMLDivElement | null>(null);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const animationRunIdRef = useRef(0);
  const animationProgressRef = useRef(0);
  const animationTargetProgressRef = useRef(0);
  const openRef = useRef(open);
  const pendingUnmountRestoreRef = useRef(false);
  const hiddenSourcePreviewRef = useRef<HTMLElement | null>(null);
  const hiddenSourcePreviewChildrenRef = useRef<HTMLElement[]>([]);
  const sourcePreviewSnapshotRef = useRef<{
    opacity: string;
    transition: string;
    transform: string;
    transformOrigin: string;
    willChange: string;
  } | null>(null);
  const sourcePreviewChildSnapshotsRef = useRef<Map<HTMLElement, { opacity: string; transition: string }> | null>(null);
  const animatedTargetSnapshotsRef = useRef<Map<HTMLElement, AnimatedNodeStyleSnapshot>>(new Map());
  const closingVisiblePreviewChildIdsRef = useRef<string[]>([]);
  const closingFromScrolledViewportRef = useRef(false);
  const hiddenSourcePreviewFolderIdRef = useRef<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const children = useMemo(
    () => (mountedShortcut && isShortcutFolder(mountedShortcut) ? getShortcutChildren(mountedShortcut) : []),
    [mountedShortcut],
  );
  const roundedCorner = `${FOLDER_PANEL_RADIUS_PX}px`;
  const maxPanelHeightPx = useMemo(() => {
    if (typeof window === 'undefined') return FOLDER_PANEL_MAX_HEIGHT_PX;
    return Math.min(FOLDER_PANEL_MAX_HEIGHT_PX, Math.floor(window.innerHeight * FOLDER_PANEL_MAX_VIEWPORT_RATIO));
  }, [mountedShortcut?.id]);

  const restoreAnimatedTargetNodes = useCallback(() => {
    animatedTargetSnapshotsRef.current.forEach((snapshot, node) => {
      if (!node.isConnected) return;
      node.style.position = snapshot.position;
      node.style.left = snapshot.left;
      node.style.top = snapshot.top;
      node.style.right = snapshot.right;
      node.style.bottom = snapshot.bottom;
      node.style.width = snapshot.width;
      node.style.height = snapshot.height;
      node.style.margin = snapshot.margin;
      node.style.transform = snapshot.transform;
      node.style.transformOrigin = snapshot.transformOrigin;
      node.style.transition = snapshot.transition;
      node.style.transitionDelay = snapshot.transitionDelay;
      node.style.opacity = snapshot.opacity;
      node.style.willChange = snapshot.willChange;
      node.style.zIndex = snapshot.zIndex;
      node.style.pointerEvents = snapshot.pointerEvents;
    });
    animatedTargetSnapshotsRef.current.clear();
  }, []);

  const updatePanelHeight = useCallback(() => {
    if (typeof window === 'undefined') return;
    const scrollRegion = scrollRegionRef.current;
    const titleHeight = titleSectionRef.current?.offsetHeight ?? 0;
    const scrollHeight = scrollRegion?.scrollHeight ?? 0;
    if (titleHeight <= 0 && scrollHeight <= 0) return;
    const scrollRegionStyles = scrollRegion ? window.getComputedStyle(scrollRegion) : null;
    const paddingTop = scrollRegionStyles ? parseFloat(scrollRegionStyles.paddingTop || '0') : 0;
    const paddingBottom = scrollRegionStyles ? parseFloat(scrollRegionStyles.paddingBottom || '0') : 0;
    const gridNode = scrollRegion?.querySelector<HTMLElement>('[data-folder-shortcut-grid="true"]');
    const gridStyles = gridNode ? window.getComputedStyle(gridNode) : null;
    const gridItem = gridNode?.querySelector<HTMLElement>('[data-folder-shortcut-grid-item="true"]');
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
  }, [children.length, compactIconSize, maxPanelHeightPx]);

  const restoreHiddenSourcePreview = useCallback(() => {
    if (typeof document === 'undefined') return;
    const sourcePreview = hiddenSourcePreviewRef.current;
    const snapshot = sourcePreviewSnapshotRef.current;
    const hiddenFolderId = hiddenSourcePreviewFolderIdRef.current;

    if (sourcePreview && snapshot && sourcePreview.isConnected) {
      sourcePreview.style.opacity = snapshot.opacity;
      sourcePreview.style.transition = snapshot.transition;
      sourcePreview.style.transform = snapshot.transform;
      sourcePreview.style.transformOrigin = snapshot.transformOrigin;
      sourcePreview.style.willChange = snapshot.willChange;
    }

    const currentPreviewChildren = hiddenFolderId
      ? Array.from(
          document.querySelectorAll<HTMLElement>(`[data-folder-preview-parent-id="${escapeSelectorValue(hiddenFolderId)}"]`),
        )
      : [];
    const nodesToRestore = new Set<HTMLElement>([
      ...hiddenSourcePreviewChildrenRef.current,
      ...currentPreviewChildren,
    ]);
    nodesToRestore.forEach((node) => {
      const snapshotEntry = sourcePreviewChildSnapshotsRef.current?.get(node);
      node.style.opacity = snapshotEntry?.opacity || '';
      node.style.transition = snapshotEntry?.transition || '';
    });

    hiddenSourcePreviewRef.current = null;
    hiddenSourcePreviewChildrenRef.current = [];
    hiddenSourcePreviewFolderIdRef.current = null;
    sourcePreviewSnapshotRef.current = null;
    sourcePreviewChildSnapshotsRef.current = null;
  }, []);

  const cancelProgressAnimation = useCallback(() => {
    animationRunIdRef.current += 1;
    if (typeof window !== 'undefined' && rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = null;
  }, []);

  const finalizeClosedOverlay = useCallback(() => {
    cancelProgressAnimation();
    animationProgressRef.current = 0;
    animationTargetProgressRef.current = 0;
    closingVisiblePreviewChildIdsRef.current = [];
    closingFromScrolledViewportRef.current = false;
    pendingUnmountRestoreRef.current = true;
    setAnimationProgress(0);
    setTransitionState(null);
    setMetrics(null);
    setFolderDragActive(false);
    setEditingTitle(false);
    setMountedShortcut(null);
  }, [cancelProgressAnimation]);

  const startProgressAnimation = useCallback((targetProgress: number) => {
    if (typeof window === 'undefined') return;

    const nextTargetProgress = clamp01(targetProgress);
    const currentProgress = animationProgressRef.current;
    animationTargetProgressRef.current = nextTargetProgress;

    if (Math.abs(currentProgress - nextTargetProgress) <= 0.0005) {
      cancelProgressAnimation();
      animationProgressRef.current = nextTargetProgress;
      setAnimationProgress(nextTargetProgress);
      setTransitionState(null);
      if (nextTargetProgress <= 0.0005 && !openRef.current) {
        finalizeClosedOverlay();
      }
      return;
    }

    cancelProgressAnimation();
    const animationDirection = nextTargetProgress > currentProgress ? 'opening' : 'closing';
    const durationMs = resolveInterruptibleAnimationDuration(currentProgress, nextTargetProgress);
    const runId = animationRunIdRef.current;
    const startTime = window.performance.now();

    setTransitionState(animationDirection);

    const tick = (frameTime: number) => {
      if (animationRunIdRef.current !== runId) return;
      const elapsedMs = frameTime - startTime;
      const linearProgress = durationMs <= 0 ? 1 : clamp01(elapsedMs / durationMs);
      const easedTimeProgress = easeOutCubic(linearProgress);
      const nextProgress = mix(currentProgress, nextTargetProgress, easedTimeProgress);
      animationProgressRef.current = nextProgress;
      setAnimationProgress(nextProgress);

      if (linearProgress >= 1) {
        rafRef.current = null;
        animationProgressRef.current = nextTargetProgress;
        setAnimationProgress(nextTargetProgress);
        setTransitionState(null);
        if (nextTargetProgress <= 0.0005 && !openRef.current) {
          finalizeClosedOverlay();
        }
        return;
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    if (durationMs <= 1) {
      animationProgressRef.current = nextTargetProgress;
      setAnimationProgress(nextTargetProgress);
      setTransitionState(null);
      if (nextTargetProgress <= 0.0005 && !openRef.current) {
        finalizeClosedOverlay();
      }
      return;
    }

    rafRef.current = window.requestAnimationFrame(tick);
  }, [cancelProgressAnimation, finalizeClosedOverlay]);

  const refreshTargetMetrics = useCallback(() => {
    const surfaceNode = surfaceRef.current;
    if (!surfaceNode || !metrics) return null;

    const targetRect = copyRect(surfaceNode.getBoundingClientRect());
    if (!targetRect) return null;

    const targetChildRects = measureTargetChildRects(surfaceNode, children);
    const nextMetrics = {
      ...metrics,
      targetRect,
      targetChildRects,
    };
    setMetrics(nextMetrics);
    return nextMetrics;
  }, [children, metrics]);

  const refreshSourceMetrics = useCallback(() => {
    if (!mountedShortcut || !metrics || typeof document === 'undefined') return null;
    const targetRect = copyRect(surfaceRef.current?.getBoundingClientRect()) ?? metrics.targetRect;
    if (!targetRect) return null;
    const nextTargetChildRects = measureTargetChildRects(surfaceRef.current, children);
    const visibleScrollViewportRect = copyRect(scrollRegionRef.current?.getBoundingClientRect());
    const scrollTop = scrollRegionRef.current?.scrollTop ?? 0;
    const closingFromScrolledViewport = scrollTop > 12;
    const closingVisiblePreviewChildIds = closingFromScrolledViewport && visibleScrollViewportRect
      ? children
          .map((child, index) => ({
            id: child.id,
            index,
            rect: nextTargetChildRects.get(child.id) ?? null,
          }))
          .filter((item): item is { id: string; index: number; rect: OverlayRect } => (
            item.rect !== null
            && rectIntersectsVertically(item.rect, visibleScrollViewportRect, 12)
          ))
          .sort((left, right) => {
            if (Math.abs(left.rect.top - right.rect.top) > 1) {
              return left.rect.top - right.rect.top;
            }
            if (Math.abs(left.rect.left - right.rect.left) > 1) {
              return left.rect.left - right.rect.left;
            }
            return left.index - right.index;
          })
          .slice(0, 4)
          .map((item) => item.id)
      : [];

    closingVisiblePreviewChildIdsRef.current = closingVisiblePreviewChildIds;
    closingFromScrolledViewportRef.current = closingFromScrolledViewport;

    const nextSourceMetrics = measureSourcePreviewMetrics({
      folderId: mountedShortcut.id,
      fallbackTargetRect: targetRect,
      shortcuts: children,
    });
    const nextMetrics = {
      ...metrics,
      sourceRect: nextSourceMetrics.sourceRect,
      sourceChildRects: nextSourceMetrics.sourceChildRects,
      sourceChildSlotRects: nextSourceMetrics.sourceChildSlotRects,
      targetRect,
      targetChildRects: nextTargetChildRects,
    };
    setMetrics(nextMetrics);
    return nextMetrics;
  }, [children, metrics, mountedShortcut]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open || !shortcut) return;
    if (mountedShortcut?.id === shortcut.id) return;

    cancelProgressAnimation();
    restoreAnimatedTargetNodes();
    restoreHiddenSourcePreview();
    pendingUnmountRestoreRef.current = false;
    closingVisiblePreviewChildIdsRef.current = [];
    closingFromScrolledViewportRef.current = false;
    animationProgressRef.current = 0;
    animationTargetProgressRef.current = 0;

    setAnimationProgress(0);
    setTransitionState(null);
    setMountedShortcut(shortcut);
    setMetrics(null);
    setFolderDragActive(false);
    setEditingTitle(false);
    setDraftTitle(shortcut.title || '');
    setPanelHeightPx(null);
  }, [
    cancelProgressAnimation,
    mountedShortcut?.id,
    open,
    restoreAnimatedTargetNodes,
    restoreHiddenSourcePreview,
    shortcut,
  ]);

  useEffect(() => {
    if (open || !mountedShortcut) return;
    setFolderDragActive(false);
    setEditingTitle(false);
    if (!metrics) {
      finalizeClosedOverlay();
    }
  }, [finalizeClosedOverlay, metrics, mountedShortcut, open]);

  useLayoutEffect(() => {
    if (!shortcut || mountedShortcut?.id !== shortcut.id) return;
    setMountedShortcut(shortcut);
    setDraftTitle(shortcut.title || '');
  }, [mountedShortcut?.id, shortcut, shortcutId]);

  useEffect(() => {
    if (!editingTitle) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [editingTitle]);

  useLayoutEffect(() => {
    if (!mountedShortcut || metrics || !surfaceRef.current || typeof document === 'undefined') {
      return;
    }

    const surfaceRect = copyRect(surfaceRef.current.getBoundingClientRect());
    if (!surfaceRect) return;

    const { sourceRect, sourceChildRects, sourceChildSlotRects } = measureSourcePreviewMetrics({
      folderId: mountedShortcut.id,
      fallbackTargetRect: surfaceRect,
      shortcuts: children,
    });

    setMetrics({
      sourceRect,
      targetRect: surfaceRect,
      sourceChildRects,
      sourceChildSlotRects,
      targetChildRects: measureTargetChildRects(surfaceRef.current, children),
    });
  }, [children, metrics, mountedShortcut]);

  useLayoutEffect(() => {
    if (!mountedShortcut) return;
    updatePanelHeight();
  }, [children.length, compactIconSize, mountedShortcut, updatePanelHeight]);

  useEffect(() => {
    if (!mountedShortcut || !metrics || typeof window === 'undefined' || !surfaceRef.current) return;

    const handleRefresh = () => {
      updatePanelHeight();
      refreshTargetMetrics();
    };

    window.addEventListener('resize', handleRefresh, { passive: true });
    window.addEventListener('scroll', handleRefresh, { passive: true, capture: true });
    scrollRegionRef.current?.addEventListener('scroll', handleRefresh, { passive: true });

    return () => {
      window.removeEventListener('resize', handleRefresh);
      window.removeEventListener('scroll', handleRefresh, true);
      scrollRegionRef.current?.removeEventListener('scroll', handleRefresh);
    };
  }, [compactIconSize, metrics, mountedShortcut, refreshTargetMetrics, updatePanelHeight]);

  useLayoutEffect(() => {
    if (!mountedShortcut || !metrics) return;
    const targetProgress = open && shortcut?.id === mountedShortcut.id ? 1 : 0;
    if (Math.abs(animationTargetProgressRef.current - targetProgress) <= 0.0005) return;
    if (targetProgress <= 0) {
      refreshSourceMetrics();
    }
    startProgressAnimation(targetProgress);
  }, [metrics, mountedShortcut, open, refreshSourceMetrics, shortcut?.id, startProgressAnimation]);

  useEffect(() => {
    if (!mountedShortcut) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mountedShortcut, onOpenChange]);

  useEffect(() => () => {
    cancelProgressAnimation();
    restoreAnimatedTargetNodes();
    restoreHiddenSourcePreview();
  }, [cancelProgressAnimation, restoreAnimatedTargetNodes, restoreHiddenSourcePreview]);

  useLayoutEffect(() => {
    if (mountedShortcut) return;
    if (!pendingUnmountRestoreRef.current) return;
    pendingUnmountRestoreRef.current = false;
    restoreAnimatedTargetNodes();
    restoreHiddenSourcePreview();
  }, [mountedShortcut, restoreAnimatedTargetNodes, restoreHiddenSourcePreview]);

  useLayoutEffect(() => {
    if (!mountedShortcut || typeof document === 'undefined') return;
    if (
      hiddenSourcePreviewFolderIdRef.current
      && hiddenSourcePreviewFolderIdRef.current !== mountedShortcut.id
    ) {
      restoreHiddenSourcePreview();
    }

    const escapedFolderId = escapeSelectorValue(mountedShortcut.id);
    const sourcePreview = document.querySelector<HTMLElement>(`[data-folder-preview-id="${escapedFolderId}"]`);
    if (!sourcePreview) return;
    const sourcePreviewChildren = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-folder-preview-parent-id="${escapedFolderId}"]`),
    );

    if (hiddenSourcePreviewRef.current !== sourcePreview) {
      hiddenSourcePreviewRef.current = sourcePreview;
      hiddenSourcePreviewFolderIdRef.current = mountedShortcut.id;
      sourcePreviewSnapshotRef.current = {
        opacity: sourcePreview.style.opacity,
        transition: sourcePreview.style.transition,
        transform: sourcePreview.style.transform,
        transformOrigin: sourcePreview.style.transformOrigin,
        willChange: sourcePreview.style.willChange,
      };
    }
    const previewChildSnapshots = sourcePreviewChildSnapshotsRef.current ?? new Map<
      HTMLElement,
      { opacity: string; transition: string }
    >();
    hiddenSourcePreviewChildrenRef.current = sourcePreviewChildren;
    sourcePreviewChildren.forEach((node) => {
      if (previewChildSnapshots.has(node)) return;
      previewChildSnapshots.set(node, {
        opacity: node.style.opacity,
        transition: node.style.transition,
      });
    });
    if (!sourcePreviewChildSnapshotsRef.current) {
      sourcePreviewChildSnapshotsRef.current = previewChildSnapshots;
    }

    const closing = transitionState === 'closing' || (!openRef.current && animationProgress < 1);
    const previewRevealProgress = closing
      ? resolveSourcePreviewCloseRevealProgress(animationProgress)
      : 1 - resolveSourcePreviewHiddenProgress(animationProgress);
    const previewOpacity = `${previewRevealProgress}`;
    const previewScale = mix(FOLDER_SOURCE_PREVIEW_HIDDEN_SCALE, 1, previewRevealProgress);
    sourcePreview.style.transformOrigin = 'center center';
    sourcePreview.style.willChange = previewRevealProgress > 0.001 && previewRevealProgress < 0.999
      ? 'opacity, transform'
      : (sourcePreviewSnapshotRef.current?.willChange || '');
    sourcePreview.style.transition = 'none';
    sourcePreview.style.opacity = previewOpacity;
    sourcePreview.style.transform = `scale(${previewScale})`;
    sourcePreviewChildren.forEach((node) => {
      node.style.transition = 'none';
      node.style.opacity = previewOpacity;
    });
  }, [animationProgress, mountedShortcut, restoreHiddenSourcePreview]);

  useLayoutEffect(() => {
    if (!surfaceRef.current || !metrics || !transitionState) return;

    const visibleScrollViewportRect = copyRect(scrollRegionRef.current?.getBoundingClientRect());
    const visibleViewportMargin = 24;
    const closingVisiblePreviewChildIds = closingVisiblePreviewChildIdsRef.current;
    const closingFromScrolledViewport = transitionState === 'closing' && closingFromScrolledViewportRef.current;

    children.forEach((child, index) => {
      const node = findTargetChildNode(surfaceRef.current, child.id);
      const targetRect = metrics.targetChildRects.get(child.id) ?? copyRect(node?.getBoundingClientRect());
      if (!node || !targetRect) return;

      if (!animatedTargetSnapshotsRef.current.has(node)) {
        animatedTargetSnapshotsRef.current.set(node, {
          position: node.style.position,
          left: node.style.left,
          top: node.style.top,
          right: node.style.right,
          bottom: node.style.bottom,
          width: node.style.width,
          height: node.style.height,
          margin: node.style.margin,
          transform: node.style.transform,
          transformOrigin: node.style.transformOrigin,
          transition: node.style.transition,
          transitionDelay: node.style.transitionDelay,
          opacity: node.style.opacity,
          willChange: node.style.willChange,
          zIndex: node.style.zIndex,
          pointerEvents: node.style.pointerEvents,
        });
      }

      const mappedPreviewSlotIndex = closingFromScrolledViewport
        ? closingVisiblePreviewChildIds.indexOf(child.id)
        : -1;
      const sourceRect = mappedPreviewSlotIndex >= 0
        ? resolveSourcePreviewSlotRect(metrics, mappedPreviewSlotIndex)
        : metrics.sourceChildRects.get(child.id)
        ?? getVirtualCollapsedChildRect({
          sourceRect: metrics.sourceRect,
          index,
          total: children.length,
        });
      const collapsedOpacity = mappedPreviewSlotIndex >= 0 || metrics.sourceChildRects.has(child.id)
        ? 1
        : HIDDEN_CHILD_OPENING_COLLAPSED_OPACITY;
      const childAnimationProgress = transitionState === 'closing'
        ? resolveBackdropAnimationProgress(animationProgress)
        : resolveChildAnimationProgress(animationProgress, index);
      const visibleInScrollViewport = !visibleScrollViewportRect
        || rectIntersectsVertically(targetRect, visibleScrollViewportRect, visibleViewportMargin);
      const transform = buildInterpolatedRectTransform(sourceRect, targetRect, childAnimationProgress);
      const opacity = `${mix(collapsedOpacity, 1, childAnimationProgress)}`;

      node.style.position = 'fixed';
      node.style.left = `${targetRect.left}px`;
      node.style.top = `${targetRect.top}px`;
      node.style.right = 'auto';
      node.style.bottom = 'auto';
      node.style.width = `${targetRect.width}px`;
      node.style.height = `${targetRect.height}px`;
      node.style.margin = '0';
      node.style.transformOrigin = 'center center';
      node.style.willChange = 'transform, opacity';
      node.style.zIndex = String(OVERLAY_Z_INDEX + 4);
      node.style.pointerEvents = 'none';
      node.style.transition = 'none';
      node.style.transitionDelay = '0ms';

      if (!visibleInScrollViewport) {
        node.style.transform = transform;
        node.style.opacity = '0';
        return;
      }

      node.style.transform = transform;
      node.style.opacity = opacity;
    });
  }, [animationProgress, children, metrics, transitionState]);

  useEffect(() => {
    if (transitionState) return;
    if (!mountedShortcut) return;
    if (!openRef.current) return;
    restoreAnimatedTargetNodes();
  }, [mountedShortcut, restoreAnimatedTargetNodes, transitionState]);

  useEffect(() => () => {
    restoreAnimatedTargetNodes();
  }, [restoreAnimatedTargetNodes]);

  if (!mountedShortcut || typeof document === 'undefined') {
    return null;
  }

  const commitTitle = () => {
    const nextName = draftTitle.trim();
    setEditingTitle(false);
    if (!nextName || nextName === mountedShortcut.title) {
      setDraftTitle(mountedShortcut.title || '');
      return;
    }
    onRenameFolder(mountedShortcut.id, nextName);
  };

  const cancelTitleEdit = () => {
    setDraftTitle(mountedShortcut.title || '');
    setEditingTitle(false);
  };

  const shellReady = Boolean(metrics);
  const openProgress = clamp01(animationProgress);
  const backdropProgress = resolveBackdropAnimationProgress(openProgress);
  const chromeProgress = resolveChromeAnimationProgress(openProgress);
  const chromeTranslateY = mix(8, 0, chromeProgress);
  const shortcutTitlesVisible = openProgress >= FOLDER_LABEL_REVEAL_START_PROGRESS;
  const surfaceFrameStyle = metrics
    ? {
        left: metrics.targetRect.left,
        top: metrics.targetRect.top,
        width: metrics.targetRect.width,
        height: metrics.targetRect.height,
        zIndex: OVERLAY_Z_INDEX + 3,
      }
    : {
        left: '50%',
        top: '50%',
        width: 'min(720px, calc(100vw - 24px))',
        transform: 'translate3d(-50%, -50%, 0)',
        visibility: 'hidden' as const,
        zIndex: OVERLAY_Z_INDEX + 3,
      };

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: OVERLAY_Z_INDEX }}>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          opacity: backdropProgress,
          backgroundColor: 'rgba(8, 10, 16, 0.7)',
          transition: 'none',
          willChange: 'opacity',
          pointerEvents: 'none',
        }}
      />
      <button
        type="button"
        aria-label={t('common.close', { defaultValue: '关闭' })}
        className="absolute inset-0 appearance-none rounded-none border-0 bg-transparent p-0"
        style={{
          pointerEvents: shellReady && openProgress > 0.04 ? 'auto' : 'none',
          WebkitAppearance: 'none',
          appearance: 'none',
        }}
        onClick={() => onOpenChange(false)}
      />

      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute"
          style={surfaceFrameStyle}
        >
          <div
            ref={surfaceRef}
            className="pointer-events-auto relative w-[min(720px,calc(100vw-24px))] max-w-[720px] overflow-visible"
            style={{
              borderRadius: roundedCorner,
              height: panelHeightPx ? `${panelHeightPx}px` : undefined,
              maxHeight: `${maxPanelHeightPx}px`,
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                borderRadius: roundedCorner,
                backgroundColor: 'rgba(15, 18, 24, 0)',
                border: folderDragActive ? '2.5px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0)',
                boxShadow: folderDragActive ? 'inset 0 0 0 1px rgba(255,255,255,0.05)' : undefined,
                opacity: folderDragActive ? 1 : 0,
                transition: `opacity 120ms ease-out, border-color 120ms ease-out, box-shadow 120ms ease-out`,
                pointerEvents: 'none',
              }}
            />
            <div
              className="relative flex h-full flex-col"
            >
              <div
                ref={titleSectionRef}
                className="px-6 pb-4 pt-6"
                style={{
                  opacity: chromeProgress,
                  transform: `translate3d(0, ${chromeTranslateY}px, 0)`,
                  transition: 'none',
                  willChange: 'opacity, transform',
                }}
              >
                <div className="text-center">
                  {editingTitle ? (
                    <input
                      ref={titleInputRef}
                      value={draftTitle}
                      maxLength={24}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      onBlur={commitTitle}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitTitle();
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelTitleEdit();
                        }
                      }}
                      className="mx-auto block w-full max-w-[320px] border-0 bg-transparent px-0 text-center text-[22px] font-semibold tracking-[-0.02em] text-white outline-none placeholder:text-white/45"
                      placeholder={t('context.folder', { defaultValue: '文件夹' })}
                    />
                  ) : (
                    <button
                      type="button"
                      className="mx-auto block max-w-[320px] truncate border-0 bg-transparent px-0 text-center text-[22px] font-semibold tracking-[-0.02em] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.28)] outline-none"
                      onClick={() => setEditingTitle(true)}
                    >
                      {mountedShortcut.title || t('context.folder', { defaultValue: '文件夹' })}
                    </button>
                  )}
                </div>
              </div>
              <div
                ref={scrollRegionRef}
                data-folder-overlay-scroll-region="true"
                className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                <FolderShortcutSurface
                  folderId={mountedShortcut.id}
                  shortcuts={children}
                  emptyText={t('context.folderEmpty', { defaultValue: '这个文件夹里还没有快捷方式' })}
                  compactIconSize={compactIconSize}
                  iconCornerRadius={iconCornerRadius}
                  iconAppearance={iconAppearance}
                  forceTextWhite
                  showShortcutTitles={shortcutTitlesVisible}
                  maskBoundaryRef={surfaceRef}
                  onShortcutOpen={onShortcutOpen}
                  onShortcutContextMenu={(event, childShortcut) => onShortcutContextMenu(event, mountedShortcut.id, childShortcut)}
                  onShortcutDropIntent={onShortcutDropIntent}
                  onExtractDragStart={onExtractDragStart}
                  onDragActiveChange={setFolderDragActive}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>,
    document.body,
  );
}
