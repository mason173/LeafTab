import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  FolderShortcutSurface,
  type FolderExtractDragStartPayload,
} from '@/features/shortcuts/components/FolderShortcutSurface';
import type { FolderShortcutDropIntent } from '@/features/shortcuts/drag/types';
import type { Shortcut } from '@/types';
import { getShortcutChildren, isShortcutFolder } from '@/utils/shortcutFolders';

type ShortcutFolderCompactOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcut: Shortcut | null;
  iconCornerRadius?: number;
  onRenameFolder: (folderId: string, name: string) => void;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu: (event: React.MouseEvent<HTMLDivElement>, folderId: string, shortcut: Shortcut) => void;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
  reduceBackdropBlur?: boolean;
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
const OPEN_DURATION_MS = 700;
const CLOSE_DURATION_MS = 460;
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const FOLDER_PANEL_RADIUS_PX = 32;
const SOURCE_PREVIEW_FADE_MS = 220;
const FOLDER_PANEL_MAX_VIEWPORT_RATIO = 0.78;
const FOLDER_PANEL_MAX_HEIGHT_PX = 680;
const FOLDER_PANEL_MAX_VISIBLE_ROWS = 5;
const HIDDEN_CHILD_OPENING_COLLAPSED_OPACITY = 0.34;
const HIDDEN_CHILD_CLOSING_COLLAPSED_OPACITY = 0;
const OPENING_GHOST_STAGGER_STEP_MS = 18;
const OPENING_GHOST_STAGGER_MAX_MS = 96;
const OPEN_TOTAL_DURATION_MS = OPEN_DURATION_MS + OPENING_GHOST_STAGGER_MAX_MS;
const LABEL_REVEAL_OPEN_DELAY_MS = 520;
const COLLAPSED_CHILD_CONTENT_RATIO = 0.94;
const SOURCE_PREVIEW_CHILD_FADE_MS = 140;
const SOURCE_PREVIEW_HIDDEN_SCALE = 0.9;
const SOURCE_PREVIEW_CLOSE_IN_MS = 220;
const SOURCE_PREVIEW_CLOSE_IN_DELAY_MS = 140;

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

function buildRectTransform(fromRect: OverlayRect, toRect: OverlayRect): string {
  const scaleX = fromRect.width / Math.max(toRect.width, 1);
  const scaleY = fromRect.height / Math.max(toRect.height, 1);
  const fromCenterX = fromRect.left + fromRect.width / 2;
  const fromCenterY = fromRect.top + fromRect.height / 2;
  const toCenterX = toRect.left + toRect.width / 2;
  const toCenterY = toRect.top + toRect.height / 2;
  const translateX = fromCenterX - toCenterX;
  const translateY = fromCenterY - toCenterY;
  return `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`;
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

      Array.from({ length: 4 }).forEach((_, index) => {
        const slotNode = document.querySelector<HTMLElement>(
          `[data-folder-preview-parent-id="${escapedFolderId}"][data-folder-preview-index="${index}"]`,
        );
        const slotRect = copyRect(slotNode?.getBoundingClientRect());
        if (slotRect) {
          sourceChildSlotRects[index] = slotRect;
        }
      });

      shortcuts.slice(0, 4).forEach((child) => {
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
  iconCornerRadius = 22,
  onRenameFolder,
  onShortcutOpen,
  onShortcutContextMenu,
  onShortcutDropIntent,
  onExtractDragStart,
  reduceBackdropBlur = false,
}: ShortcutFolderCompactOverlayProps) {
  const { t } = useTranslation();
  const shortcutId = shortcut?.id ?? null;
  const [mountedShortcut, setMountedShortcut] = useState<Shortcut | null>(open ? shortcut : null);
  const [metrics, setMetrics] = useState<OverlayMetrics | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [transitionState, setTransitionState] = useState<'opening' | 'closing' | null>(open ? 'opening' : null);
  const [folderDragActive, setFolderDragActive] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [panelHeightPx, setPanelHeightPx] = useState<number | null>(null);
  const [labelsVisible, setLabelsVisible] = useState(false);
  const titleSectionRef = useRef<HTMLDivElement | null>(null);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const animationTimerRef = useRef<number | null>(null);
  const labelRevealTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const sourcePreviewFadeRafRef = useRef<number | null>(null);
  const lastOpenedShortcutIdRef = useRef<string | null>(null);
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
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const children = useMemo(
    () => (mountedShortcut && isShortcutFolder(mountedShortcut) ? getShortcutChildren(mountedShortcut) : []),
    [mountedShortcut],
  );
  const activeDurationMs = transitionState === 'closing' ? CLOSE_DURATION_MS : OPEN_DURATION_MS;
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
  }, [children.length, maxPanelHeightPx]);

  const refreshTargetMetrics = useCallback(() => {
    const surfaceNode = surfaceRef.current;
    if (!surfaceNode) return;

    const targetRect = copyRect(surfaceNode.getBoundingClientRect());
    if (!targetRect) return;

    const targetChildRects = measureTargetChildRects(surfaceNode, children);
    setMetrics((current) => (current
      ? {
          ...current,
          targetRect,
          targetChildRects,
        }
      : current));
  }, [children]);

  const refreshSourceMetrics = useCallback(() => {
    if (!mountedShortcut || typeof document === 'undefined') return;
    const targetRect = copyRect(surfaceRef.current?.getBoundingClientRect()) ?? metrics?.targetRect;
    if (!targetRect) return;
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
            Boolean(item.rect)
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

    setMetrics((current) => (current
      ? {
          ...current,
          sourceRect: nextSourceMetrics.sourceRect,
          sourceChildRects: nextSourceMetrics.sourceChildRects,
          sourceChildSlotRects: nextSourceMetrics.sourceChildSlotRects,
          targetRect,
          targetChildRects: nextTargetChildRects,
        }
      : current));
  }, [children, metrics?.targetRect, mountedShortcut]);

  useEffect(() => {
    if (open && shortcut && lastOpenedShortcutIdRef.current !== shortcut.id) {
      lastOpenedShortcutIdRef.current = shortcut.id;
      closingVisiblePreviewChildIdsRef.current = [];
      closingFromScrolledViewportRef.current = false;
      setMountedShortcut(shortcut);
      setMetrics(null);
      setExpanded(false);
      setLabelsVisible(false);
      setFolderDragActive(false);
      setEditingTitle(false);
      setDraftTitle(shortcut.title || '');
      setTransitionState('opening');
      setPanelHeightPx(null);
      return;
    }

    if (!open && mountedShortcut) {
      lastOpenedShortcutIdRef.current = null;
      setLabelsVisible(false);
      setFolderDragActive(false);
      setEditingTitle(false);
      if (!metrics) {
        closingVisiblePreviewChildIdsRef.current = [];
        closingFromScrolledViewportRef.current = false;
        setMountedShortcut(null);
        setTransitionState(null);
        return;
      }

      if (transitionState !== 'closing') {
        if (rafRef.current !== null) {
          window.cancelAnimationFrame(rafRef.current);
        }
        refreshSourceMetrics();
        setTransitionState('closing');
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = window.requestAnimationFrame(() => {
            rafRef.current = null;
            setExpanded(false);
          });
        });
      }
    }
  }, [metrics, mountedShortcut, open, refreshSourceMetrics, shortcut, transitionState]);

  useEffect(() => {
    if (!open || !shortcut || mountedShortcut?.id !== shortcut.id) return;
    setMountedShortcut(shortcut);
    setDraftTitle(shortcut.title || '');
  }, [mountedShortcut?.id, open, shortcut, shortcutId]);

  useEffect(() => {
    if (!editingTitle) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [editingTitle]);

  useLayoutEffect(() => {
    if (!mountedShortcut || transitionState !== 'opening' || metrics || !surfaceRef.current || typeof document === 'undefined') {
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
  }, [children, metrics, mountedShortcut, transitionState]);

  useLayoutEffect(() => {
    if (!mountedShortcut) return;
    updatePanelHeight();
  }, [children.length, mountedShortcut, updatePanelHeight]);

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
  }, [metrics, mountedShortcut, refreshTargetMetrics, updatePanelHeight]);

  useEffect(() => {
    if (!metrics || transitionState !== 'opening') return;

    if (animationTimerRef.current !== null) {
      window.clearTimeout(animationTimerRef.current);
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        setExpanded(true);
      });
    });
    animationTimerRef.current = window.setTimeout(() => {
      animationTimerRef.current = null;
      setTransitionState(null);
    }, OPEN_TOTAL_DURATION_MS);

    return () => {
      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [metrics, transitionState]);

  useEffect(() => {
    if (transitionState === 'closing') {
      if (labelRevealTimerRef.current !== null) {
        window.clearTimeout(labelRevealTimerRef.current);
        labelRevealTimerRef.current = null;
      }
      setLabelsVisible(false);
      return;
    }

    if (transitionState !== 'opening') {
      if (mountedShortcut) {
        setLabelsVisible(true);
      }
      return;
    }

    if (labelRevealTimerRef.current !== null) {
      window.clearTimeout(labelRevealTimerRef.current);
    }

    setLabelsVisible(false);
    labelRevealTimerRef.current = window.setTimeout(() => {
      labelRevealTimerRef.current = null;
      setLabelsVisible(true);
    }, LABEL_REVEAL_OPEN_DELAY_MS);

    return () => {
      if (labelRevealTimerRef.current !== null) {
        window.clearTimeout(labelRevealTimerRef.current);
        labelRevealTimerRef.current = null;
      }
    };
  }, [mountedShortcut, transitionState]);

  useEffect(() => {
    if (transitionState !== 'closing') return;

    if (animationTimerRef.current !== null) {
      window.clearTimeout(animationTimerRef.current);
    }
    animationTimerRef.current = window.setTimeout(() => {
      animationTimerRef.current = null;
      closingVisiblePreviewChildIdsRef.current = [];
      closingFromScrolledViewportRef.current = false;
      setTransitionState(null);
      setMetrics(null);
      setFolderDragActive(false);
      setMountedShortcut(null);
    }, CLOSE_DURATION_MS);

    return () => {
      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [transitionState]);

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
    if (animationTimerRef.current !== null) {
      window.clearTimeout(animationTimerRef.current);
    }
    if (labelRevealTimerRef.current !== null) {
      window.clearTimeout(labelRevealTimerRef.current);
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
    }
    if (sourcePreviewFadeRafRef.current !== null) {
      window.cancelAnimationFrame(sourcePreviewFadeRafRef.current);
    }
  }, []);

  useEffect(() => {
    if (!mountedShortcut || typeof document === 'undefined') return;

    const escapedFolderId = escapeSelectorValue(mountedShortcut.id);
    const sourcePreview = document.querySelector<HTMLElement>(`[data-folder-preview-id="${escapedFolderId}"]`);
    if (!sourcePreview) return;
    const sourcePreviewChildren = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-folder-preview-parent-id="${escapedFolderId}"]`),
    );

    if (hiddenSourcePreviewRef.current !== sourcePreview) {
      hiddenSourcePreviewRef.current = sourcePreview;
      sourcePreviewSnapshotRef.current = {
        opacity: sourcePreview.style.opacity,
        transition: sourcePreview.style.transition,
        transform: sourcePreview.style.transform,
        transformOrigin: sourcePreview.style.transformOrigin,
        willChange: sourcePreview.style.willChange,
      };
    }
    const previewChildrenChanged = hiddenSourcePreviewChildrenRef.current.length !== sourcePreviewChildren.length
      || hiddenSourcePreviewChildrenRef.current.some((node, index) => node !== sourcePreviewChildren[index]);
    if (previewChildrenChanged || !sourcePreviewChildSnapshotsRef.current) {
      hiddenSourcePreviewChildrenRef.current = sourcePreviewChildren;
      sourcePreviewChildSnapshotsRef.current = new Map(
        sourcePreviewChildren.map((node) => [node, {
          opacity: node.style.opacity,
          transition: node.style.transition,
        }]),
      );
    }

    if (sourcePreviewFadeRafRef.current !== null) {
      window.cancelAnimationFrame(sourcePreviewFadeRafRef.current);
      sourcePreviewFadeRafRef.current = null;
    }

    if (transitionState === 'closing') {
      const sourcePreviewFadeInMs = Math.min(SOURCE_PREVIEW_CLOSE_IN_MS, CLOSE_DURATION_MS);
      const sourcePreviewFadeInDelayMs = Math.max(0, Math.min(SOURCE_PREVIEW_CLOSE_IN_DELAY_MS, CLOSE_DURATION_MS - sourcePreviewFadeInMs));
      sourcePreview.style.transformOrigin = 'center center';
      sourcePreview.style.willChange = 'opacity, transform';
      sourcePreview.style.transition = `opacity ${sourcePreviewFadeInMs}ms ${EASING} ${sourcePreviewFadeInDelayMs}ms, transform ${sourcePreviewFadeInMs}ms ${EASING} ${sourcePreviewFadeInDelayMs}ms`;
      sourcePreview.style.opacity = sourcePreviewSnapshotRef.current?.opacity || '1';
      sourcePreview.style.transform = sourcePreviewSnapshotRef.current?.transform || 'scale(1)';
      sourcePreviewChildren.forEach((node) => {
        node.style.transition = 'none';
        node.style.opacity = '0';
      });
      return;
    }

    sourcePreview.style.transformOrigin = 'center center';
    sourcePreview.style.willChange = 'opacity, transform';
    sourcePreview.style.transition = `opacity ${SOURCE_PREVIEW_FADE_MS}ms ${EASING}, transform ${SOURCE_PREVIEW_FADE_MS}ms ${EASING}`;
    sourcePreviewChildren.forEach((node) => {
      node.style.transition = `opacity ${SOURCE_PREVIEW_CHILD_FADE_MS}ms ${EASING}`;
    });
    sourcePreviewFadeRafRef.current = window.requestAnimationFrame(() => {
      sourcePreviewFadeRafRef.current = null;
      sourcePreview.style.opacity = '0';
      sourcePreview.style.transform = `scale(${SOURCE_PREVIEW_HIDDEN_SCALE})`;
      sourcePreviewChildren.forEach((node) => {
        node.style.opacity = '0';
      });
    });
  }, [mountedShortcut, transitionState]);

  useEffect(() => {
    if (mountedShortcut) return;
    const sourcePreview = hiddenSourcePreviewRef.current;
    const snapshot = sourcePreviewSnapshotRef.current;
    if (sourcePreview && snapshot) {
      sourcePreview.style.opacity = snapshot.opacity;
      sourcePreview.style.transition = snapshot.transition;
      sourcePreview.style.transform = snapshot.transform;
      sourcePreview.style.transformOrigin = snapshot.transformOrigin;
      sourcePreview.style.willChange = snapshot.willChange;
    }
    hiddenSourcePreviewChildrenRef.current.forEach((node) => {
      const snapshotEntry = sourcePreviewChildSnapshotsRef.current?.get(node);
      node.style.opacity = snapshotEntry?.opacity || '';
      node.style.transition = snapshotEntry?.transition || '';
    });
    hiddenSourcePreviewRef.current = null;
    hiddenSourcePreviewChildrenRef.current = [];
    sourcePreviewSnapshotRef.current = null;
    sourcePreviewChildSnapshotsRef.current = null;
  }, [mountedShortcut]);

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
      const collapsedTransform = buildRectTransform(sourceRect, targetRect);
      const openingDelayMs = Math.min(OPENING_GHOST_STAGGER_MAX_MS, index * OPENING_GHOST_STAGGER_STEP_MS);
      const collapsedOpacity = metrics.sourceChildRects.has(child.id) ? 1 : HIDDEN_CHILD_OPENING_COLLAPSED_OPACITY;
      const closingCollapsedOpacity = mappedPreviewSlotIndex >= 0 || metrics.sourceChildRects.has(child.id)
        ? 1
        : HIDDEN_CHILD_CLOSING_COLLAPSED_OPACITY;
      const visibleInScrollViewport = !visibleScrollViewportRect
        || rectIntersectsVertically(targetRect, visibleScrollViewportRect, visibleViewportMargin);
      const hiddenOnCollapse = closingCollapsedOpacity <= 0.001;
      const closingOpacityTransition = hiddenOnCollapse
        ? `opacity ${Math.max(160, Math.round(CLOSE_DURATION_MS * 0.42))}ms ${EASING} ${Math.max(36, Math.round(CLOSE_DURATION_MS * 0.1))}ms`
        : `opacity ${Math.max(220, CLOSE_DURATION_MS - 100)}ms ${EASING}`;

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

      if (!visibleInScrollViewport) {
        node.style.transition = 'none';
        node.style.transitionDelay = '0ms';
        node.style.transform = transitionState === 'closing' && !expanded
          ? collapsedTransform
          : 'translate3d(0, 0, 0) scale(1, 1)';
        node.style.opacity = '0';
        return;
      }

      if (transitionState === 'opening' && !expanded) {
        node.style.transition = 'none';
        node.style.transitionDelay = '0ms';
        node.style.transform = collapsedTransform;
        node.style.opacity = `${collapsedOpacity}`;
        return;
      }

      if (transitionState === 'opening' && expanded) {
        void node.getBoundingClientRect();
        node.style.transition = `transform ${OPEN_DURATION_MS}ms ${EASING}, opacity ${Math.max(220, OPEN_DURATION_MS - 100)}ms ${EASING}`;
        node.style.transitionDelay = `${openingDelayMs}ms`;
        node.style.transform = 'translate3d(0, 0, 0) scale(1, 1)';
        node.style.opacity = '1';
        return;
      }

      if (transitionState === 'closing' && expanded) {
        node.style.transition = 'none';
        node.style.transitionDelay = '0ms';
        node.style.transform = 'translate3d(0, 0, 0) scale(1, 1)';
        node.style.opacity = '1';
        return;
      }

      void node.getBoundingClientRect();
      node.style.transition = `transform ${CLOSE_DURATION_MS}ms ${EASING}, ${closingOpacityTransition}`;
      node.style.transitionDelay = '0ms';
      node.style.transform = collapsedTransform;
      node.style.opacity = `${closingCollapsedOpacity}`;
    });
  }, [children, expanded, metrics, transitionState]);

  useEffect(() => {
    if (transitionState) return;
    restoreAnimatedTargetNodes();
  }, [restoreAnimatedTargetNodes, transitionState]);

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
  const closing = transitionState === 'closing';
  const chromeVisible = labelsVisible;
  const chromeTransition = closing
    ? 'opacity 90ms ease-out, transform 120ms ease-out'
    : `opacity 180ms ${EASING}, transform 260ms ${EASING}`;
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
          opacity: expanded ? 1 : 0,
          backgroundColor: 'rgba(8, 10, 16, 0.08)',
          backdropFilter: reduceBackdropBlur ? undefined : `blur(${expanded ? 20 : 0}px)`,
          WebkitBackdropFilter: reduceBackdropBlur ? undefined : `blur(${expanded ? 20 : 0}px)`,
          transition: `opacity ${activeDurationMs}ms ${EASING}, backdrop-filter ${activeDurationMs}ms ${EASING}, -webkit-backdrop-filter ${activeDurationMs}ms ${EASING}`,
          willChange: 'opacity, backdrop-filter',
          pointerEvents: 'none',
        }}
      />
      <button
        type="button"
        aria-label={t('common.close', { defaultValue: '关闭' })}
        className="absolute inset-0 appearance-none rounded-none border-0 bg-transparent p-0"
        style={{
          pointerEvents: shellReady ? 'auto' : 'none',
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
                border: folderDragActive ? '1.5px solid rgba(255,255,255,0.92)' : '1px solid rgba(255,255,255,0)',
                boxShadow: folderDragActive ? '0 0 0 1px rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.08)' : undefined,
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
                  opacity: chromeVisible ? 1 : 0,
                  transform: chromeVisible ? 'translate3d(0, 0, 0)' : 'translate3d(0, 8px, 0)',
                  transition: chromeTransition,
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
                  iconCornerRadius={iconCornerRadius}
                  forceTextWhite
                  showShortcutTitles={labelsVisible}
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
