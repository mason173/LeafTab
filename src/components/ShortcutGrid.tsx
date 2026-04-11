import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { RiCheckFill } from '@/icons/ri-compat';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import type { Shortcut } from '../types';
import { ShortcutCardRenderer } from './shortcuts/ShortcutCardRenderer';
import {
  DEFAULT_SHORTCUT_CARD_VARIANT,
  type ShortcutCardVariant,
  type ShortcutLayoutDensity,
} from './shortcuts/shortcutCardVariant';
import { getShortcutIconBorderRadius } from '@/utils/shortcutIconSettings';
import { getReorderTargetIndex } from '@/features/shortcuts/drag/dropEdge';
import { resolveRootDropIntent } from '@/features/shortcuts/drag/resolveRootDropIntent';
import type { RootShortcutDropIntent } from '@/features/shortcuts/drag/types';
import {
  buildReorderProjectionOffsets as buildSharedReorderProjectionOffsets,
  getDragVisualCenter,
  measureDragItems,
  pickClosestMeasuredItem,
  type ActivePointerDragState,
  type MeasuredDragItem,
  type PendingPointerDragState,
  type PointerPoint,
  type ProjectionOffset,
} from '@/features/shortcuts/drag/gridDragEngine';
import { DraggableShortcutItemFrame } from '@/features/shortcuts/components/DraggableShortcutItemFrame';

const DRAG_ACTIVATION_DISTANCE_PX = 8;
const DRAG_OVERLAY_Z_INDEX = 14030;
const DRAG_AUTO_SCROLL_EDGE_PX = 88;
const DRAG_AUTO_SCROLL_MAX_SPEED_PX = 26;
const DRAG_MATCH_DISTANCE_PX = 64;
const CENTER_INTENT_DELAY_MS = 320;

type RootHoverState =
  | { type: 'item'; sortId: string; edge: 'before' | 'after' | 'center' }
  | null;

type GridItem = {
  sortId: string;
  shortcut: Shortcut;
  shortcutIndex: number;
};
type PendingDragState = PendingPointerDragState<string> & {
  activeSortId: string;
  current: PointerPoint;
};
type DragSessionState = ActivePointerDragState<string> & {
  activeSortId: string;
};

type CenterHoverCandidate = {
  targetSortId: string;
  intentType: Extract<RootShortcutDropIntent['type'], 'merge-root-shortcuts' | 'move-root-shortcut-into-folder'>;
  startedAt: number;
};

type MeasuredGridItem = MeasuredDragItem<GridItem>;

type OverlaySnapPosition = {
  left: number;
  top: number;
};

export type ExternalShortcutDragSession = {
  token: number;
  shortcutId: string;
  pointerId: number;
  pointerType: string;
  pointer: PointerPoint;
  anchor: {
    xRatio: number;
    yRatio: number;
  };
};

function DragPreviewIcon({
  shortcut,
  size,
  cornerRadius,
}: {
  shortcut: Shortcut;
  size: number;
  cornerRadius: number;
}) {
  const iconSrc = (shortcut.icon || '').trim();
  const label = (shortcut.title || shortcut.url || '?').trim();
  const fallbackText = (label.charAt(0) || '?').toUpperCase();
  const borderRadius = getShortcutIconBorderRadius(cornerRadius);

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt=""
        draggable={false}
        className="shrink-0 object-cover"
        style={{ width: size, height: size, borderRadius }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center bg-primary/12 text-primary"
      style={{ width: size, height: size, fontSize: Math.max(14, Math.round(size * 0.38)), fontWeight: 600, borderRadius }}
    >
      {fallbackText}
    </span>
  );
}

function LightweightDragPreview({
  shortcut,
  cardVariant,
  firefox,
  compactShowTitle,
  compactIconSize,
  iconCornerRadius,
  compactTitleFontSize,
  defaultIconSize,
  defaultTitleFontSize,
  defaultUrlFontSize,
  defaultVerticalPadding,
  forceTextWhite,
}: {
  shortcut: Shortcut;
  cardVariant: ShortcutCardVariant;
  firefox: boolean;
  compactShowTitle: boolean;
  compactIconSize: number;
  iconCornerRadius: number;
  compactTitleFontSize: number;
  defaultIconSize: number;
  defaultTitleFontSize: number;
  defaultUrlFontSize: number;
  defaultVerticalPadding: number;
  forceTextWhite: boolean;
}) {
  if (cardVariant === 'compact') {
    return (
      <div
        className="pointer-events-none select-none"
        style={{
          width: compactIconSize,
          contain: 'layout paint style',
          willChange: firefox ? undefined : 'transform',
        }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <DragPreviewIcon shortcut={shortcut} size={compactIconSize} cornerRadius={iconCornerRadius} />
          {compactShowTitle ? (
            <p
              className={`truncate text-center leading-4 ${forceTextWhite ? 'text-white' : 'text-foreground'}`}
              style={{ width: compactIconSize, fontSize: compactTitleFontSize }}
            >
              {shortcut.title}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none select-none rounded-xl border border-border/40 bg-background/95 shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
      style={{
        width: 'min(280px, 72vw)',
        padding: `${defaultVerticalPadding}px 8px`,
        contain: 'layout paint style',
        willChange: firefox ? undefined : 'transform',
      }}
    >
      <div className="flex items-center gap-2">
        <DragPreviewIcon shortcut={shortcut} size={defaultIconSize} cornerRadius={iconCornerRadius} />
        <div className="min-w-0 flex-1 leading-none">
          <p
            className={`truncate font-['PingFang_SC:Medium',sans-serif] ${forceTextWhite ? 'text-white' : 'text-foreground'}`}
            style={{ fontSize: defaultTitleFontSize }}
          >
            {shortcut.title}
          </p>
          <p
            className={`truncate font-['PingFang_SC:Regular',sans-serif] ${forceTextWhite ? 'text-white/80' : 'text-muted-foreground'}`}
            style={{ fontSize: defaultUrlFontSize, marginTop: 3 }}
          >
            {shortcut.url}
          </p>
        </div>
      </div>
    </div>
  );
}

function findScrollableParent(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const canScroll = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
      && current.scrollHeight > current.clientHeight + 1;
    if (canScroll) return current;
    current = current.parentElement;
  }
  return null;
}

function deriveHoverStateFromIntent(intent: RootShortcutDropIntent | null): RootHoverState {
  if (!intent) return null;

  switch (intent.type) {
    case 'reorder-root':
      return {
        type: 'item',
        sortId: intent.overShortcutId,
        edge: intent.edge,
      };
    case 'merge-root-shortcuts':
      return {
        type: 'item',
        sortId: intent.targetShortcutId,
        edge: 'center',
      };
    case 'move-root-shortcut-into-folder':
      return {
        type: 'item',
        sortId: intent.targetFolderId,
        edge: 'center',
      };
    default:
      return null;
  }
}

function measureGridItems(items: GridItem[], itemElements: Map<string, HTMLDivElement>): MeasuredGridItem[] {
  return measureDragItems({
    items,
    itemElements,
    getId: (item) => item.sortId,
  });
}

function getReorderEdgeFromPointer(point: PointerPoint, rect: DOMRect): 'before' | 'after' {
  const normalizedX = Math.min(1, Math.max(0, (point.x - rect.left) / rect.width));
  const normalizedY = Math.min(1, Math.max(0, (point.y - rect.top) / rect.height));
  const distanceX = Math.abs(normalizedX - 0.5);
  const distanceY = Math.abs(normalizedY - 0.5);

  if (distanceX >= distanceY) {
    return normalizedX < 0.5 ? 'before' : 'after';
  }

  return normalizedY < 0.5 ? 'before' : 'after';
}

function buildFallbackReorderIntent(params: {
  activeSortId: string;
  overItem: MeasuredGridItem;
  pointer: PointerPoint;
  measuredItems: MeasuredGridItem[];
}): RootShortcutDropIntent | null {
  const { activeSortId, overItem, pointer, measuredItems } = params;
  const activeItem = measuredItems.find((item) => item.sortId === activeSortId);
  if (!activeItem) return null;

  const edge = getReorderEdgeFromPointer(pointer, overItem.rect);
  const targetIndex = getReorderTargetIndex(activeItem.shortcutIndex, overItem.shortcutIndex, edge);
  if (targetIndex === activeItem.shortcutIndex) return null;

  return {
    type: 'reorder-root',
    activeShortcutId: activeItem.shortcut.id,
    overShortcutId: overItem.shortcut.id,
    targetIndex,
    edge,
  };
}

function pickOverItem(params: {
  activeSortId: string;
  measuredItems: MeasuredGridItem[];
  pointer: PointerPoint;
}): MeasuredGridItem | null {
  const { activeSortId, measuredItems, pointer } = params;
  return pickClosestMeasuredItem({
    activeId: activeSortId,
    measuredItems,
    pointer,
    getId: (item) => item.sortId,
    maxDistance: DRAG_MATCH_DISTANCE_PX,
  });
}

function getCenterIntentTargetSortId(intent: RootShortcutDropIntent | null): string | null {
  if (!intent) return null;
  if (intent.type === 'merge-root-shortcuts') return intent.targetShortcutId;
  if (intent.type === 'move-root-shortcut-into-folder') return intent.targetFolderId;
  return null;
}

function buildReorderProjectionOffsets(params: {
  items: GridItem[];
  layoutSnapshot: MeasuredGridItem[] | null;
  activeSortId: string | null;
  hoverIntent: RootShortcutDropIntent | null;
}): Map<string, ProjectionOffset> {
  const { items, layoutSnapshot, activeSortId, hoverIntent } = params;
  return buildSharedReorderProjectionOffsets({
    items,
    layoutSnapshot,
    activeId: activeSortId,
    hoveredId: hoverIntent?.type === 'reorder-root' ? hoverIntent.overShortcutId : null,
    targetIndex: hoverIntent?.type === 'reorder-root' ? hoverIntent.targetIndex : null,
    getId: (item) => item.sortId,
  });
}

function ShortcutGridItem({
  sortId,
  shortcut,
  activeDragId,
  hoverState,
  cardVariant,
  gridColumns,
  compactShowTitle,
  compactIconSize,
  iconCornerRadius,
  compactTitleFontSize,
  defaultIconSize,
  defaultTitleFontSize,
  defaultUrlFontSize,
  defaultVerticalPadding,
  forceTextWhite,
  onPointerDown,
  onOpen,
  onContextMenu,
  selected,
  selectionMode,
  dragDisabled,
  disableReorderAnimation,
  firefox,
  projectionOffset,
  registerItemElement,
}: {
  sortId: string;
  shortcut: Shortcut;
  activeDragId: string | null;
  hoverState: RootHoverState;
  cardVariant: ShortcutCardVariant;
  gridColumns: number;
  compactShowTitle: boolean;
  compactIconSize: number;
  iconCornerRadius: number;
  compactTitleFontSize: number;
  defaultIconSize: number;
  defaultTitleFontSize: number;
  defaultUrlFontSize: number;
  defaultVerticalPadding: number;
  forceTextWhite: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  selected: boolean;
  selectionMode: boolean;
  dragDisabled: boolean;
  disableReorderAnimation: boolean;
  firefox: boolean;
  projectionOffset?: ProjectionOffset | null;
  registerItemElement: (element: HTMLDivElement | null) => void;
}) {
  const isDragging = activeDragId === sortId;
  const defaultPlaceholderHeight = defaultIconSize + defaultVerticalPadding * 2;
  const isHovered = hoverState?.type === 'item' && hoverState.sortId === sortId;
  const hoverEdge = isHovered ? hoverState.edge : null;
  const centerPreviewActive = hoverEdge === 'center';

  return (
    <DraggableShortcutItemFrame
      cardVariant={cardVariant}
      compactIconSize={compactIconSize}
      iconCornerRadius={iconCornerRadius}
      defaultPlaceholderHeight={defaultPlaceholderHeight}
      isDragging={isDragging}
      hideDragPlaceholder
      centerPreviewActive={centerPreviewActive}
      projectionOffset={projectionOffset}
      disableReorderAnimation={disableReorderAnimation}
      firefox={firefox}
      dimmed={selectionMode && !selected}
      dragDisabled={dragDisabled}
      registerElement={registerItemElement}
      onPointerDown={onPointerDown}
      frameProps={{
        'data-shortcut-grid-columns': gridColumns,
        'data-shortcut-drag-item': 'true',
        'data-testid': `shortcut-card-${sortId}`,
        'data-shortcut-id': shortcut.id,
        'data-shortcut-title': shortcut.title,
      }}
      selectionOverlay={selectionMode ? (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          aria-hidden="true"
        >
          {selected ? (
            <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <RiCheckFill className="size-3.5" />
            </span>
          ) : null}
        </div>
      ) : null}
    >
      <ShortcutCardRenderer
        variant={cardVariant}
        compactShowTitle={compactShowTitle}
        compactIconSize={compactIconSize}
        iconCornerRadius={iconCornerRadius}
        compactTitleFontSize={compactTitleFontSize}
        defaultIconSize={defaultIconSize}
        defaultTitleFontSize={defaultTitleFontSize}
        defaultUrlFontSize={defaultUrlFontSize}
        defaultVerticalPadding={defaultVerticalPadding}
        forceTextWhite={forceTextWhite}
        shortcut={shortcut}
        onOpen={onOpen}
        onContextMenu={onContextMenu}
      />
    </DraggableShortcutItemFrame>
  );
}

interface ShortcutGridProps {
  containerHeight: number;
  bottomInset?: number;
  shortcuts: Shortcut[];
  gridColumns: number;
  minRows: number;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu: (event: React.MouseEvent<HTMLDivElement>, shortcutIndex: number, shortcut: Shortcut) => void;
  onShortcutReorder: (nextShortcuts: Shortcut[]) => void;
  onShortcutDropIntent?: (intent: RootShortcutDropIntent) => void;
  onGridContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  cardVariant?: ShortcutCardVariant;
  compactShowTitle?: boolean;
  layoutDensity?: ShortcutLayoutDensity;
  compactIconSize?: number;
  iconCornerRadius?: number;
  compactTitleFontSize?: number;
  defaultIconSize?: number;
  defaultTitleFontSize?: number;
  defaultUrlFontSize?: number;
  defaultVerticalPadding?: number;
  forceTextWhite?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disableReorderAnimation?: boolean;
  selectionMode?: boolean;
  selectedShortcutIndexes?: ReadonlySet<number>;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
  externalDragSession?: ExternalShortcutDragSession | null;
  onExternalDragSessionConsumed?: (token: number) => void;
}

export const ShortcutGrid = React.memo(function ShortcutGrid({
  containerHeight,
  bottomInset = 0,
  shortcuts,
  gridColumns,
  minRows,
  onShortcutOpen,
  onShortcutContextMenu,
  onShortcutReorder,
  onShortcutDropIntent,
  onGridContextMenu,
  cardVariant = DEFAULT_SHORTCUT_CARD_VARIANT,
  compactShowTitle = true,
  layoutDensity = 'regular',
  compactIconSize = 72,
  iconCornerRadius = 22,
  compactTitleFontSize = 12,
  defaultIconSize = 36,
  defaultTitleFontSize = 14,
  defaultUrlFontSize = 10,
  defaultVerticalPadding = 8,
  forceTextWhite = false,
  onDragStart,
  onDragEnd,
  disableReorderAnimation = false,
  selectionMode = false,
  selectedShortcutIndexes,
  onToggleShortcutSelection,
  externalDragSession,
  onExternalDragSessionConsumed,
}: ShortcutGridProps) {
  const firefox = isFirefoxBuildTarget();
  const compactLayout = cardVariant === 'compact';
  const rowGap = cardVariant === 'compact'
    ? (layoutDensity === 'compact' ? 16 : layoutDensity === 'large' ? 24 : 20)
    : 8;
  const items = useMemo(() => {
    const used = new Map<string, number>();
    return shortcuts.map((shortcut, index) => {
      const shortcutIndex = index;
      const baseId = (shortcut.id || `${shortcut.url}::${shortcut.title}` || `shortcut-${shortcutIndex}`).trim();
      const duplicateCount = used.get(baseId) ?? 0;
      used.set(baseId, duplicateCount + 1);
      const sortId = duplicateCount === 0 ? baseId : `${baseId}::dup-${duplicateCount}`;
      return { sortId, shortcut, shortcutIndex };
    });
  }, [shortcuts]);

  const [dragging, setDragging] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragPointer, setDragPointer] = useState<PointerPoint | null>(null);
  const [dragPreviewOffset, setDragPreviewOffset] = useState<PointerPoint | null>(null);
  const [hoverIntent, setHoverIntent] = useState<RootShortcutDropIntent | null>(null);
  const [dragLayoutSnapshot, setDragLayoutSnapshot] = useState<MeasuredGridItem[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemElementsRef = useRef(new Map<string, HTMLDivElement>());
  const pendingDragRef = useRef<PendingDragState | null>(null);
  const dragSessionRef = useRef<DragSessionState | null>(null);
  const latestPointerRef = useRef<PointerPoint | null>(null);
  const hoverIntentRef = useRef<RootShortcutDropIntent | null>(null);
  const activeDragIdRef = useRef<string | null>(null);
  const centerHoverCandidateRef = useRef<CenterHoverCandidate | null>(null);
  const dropCleanupRafRef = useRef<number | null>(null);
  const ignoreClickRef = useRef(false);
  const autoScrollContainerRef = useRef<HTMLElement | null>(null);
  const autoScrollBoundsRef = useRef<{ top: number; bottom: number } | null>(null);
  const autoScrollVelocityRef = useRef(0);
  const autoScrollRafRef = useRef<number | null>(null);
  const consumedExternalDragTokenRef = useRef<number | null>(null);

  const actualRows = Math.ceil(items.length / Math.max(gridColumns, 1));
  const displayRows = Math.max(actualRows, minRows);
  const rowHeight = cardVariant === 'compact'
    ? (compactIconSize + 24)
    : (defaultIconSize + defaultVerticalPadding * 2);
  const gridMinHeight = displayRows * rowHeight + Math.max(0, displayRows - 1) * rowGap;

  const activeDragItem = useMemo(
    () => items.find((item) => item.sortId === activeDragId) ?? null,
    [activeDragId, items],
  );

  const hoverState = useMemo(
    () => deriveHoverStateFromIntent(hoverIntent),
    [hoverIntent],
  );

  const projectionOffsets = useMemo(
    () => buildReorderProjectionOffsets({
      items,
      layoutSnapshot: dragLayoutSnapshot,
      activeSortId: activeDragId,
      hoverIntent,
    }),
    [activeDragId, dragLayoutSnapshot, hoverIntent, items],
  );

  const overlaySnapPosition = useMemo<OverlaySnapPosition | null>(() => {
    if (!activeDragId) return null;
    const targetSortId = getCenterIntentTargetSortId(hoverIntent);
    if (!targetSortId) return null;

    const snapshotById = new Map((dragLayoutSnapshot ?? []).map((item) => [item.sortId, item]));
    const activeRect = snapshotById.get(activeDragId)?.rect;
    const targetRect = snapshotById.get(targetSortId)?.rect;
    if (!activeRect || !targetRect) return null;

    return {
      left: targetRect.left + (targetRect.width - activeRect.width) / 2,
      top: targetRect.top + (targetRect.height - activeRect.height) / 2,
    };
  }, [activeDragId, dragLayoutSnapshot, hoverIntent]);

  useEffect(() => {
    activeDragIdRef.current = activeDragId;
  }, [activeDragId]);

  useEffect(() => {
    hoverIntentRef.current = hoverIntent;
  }, [hoverIntent]);

  const stopAutoScroll = useCallback(() => {
    autoScrollVelocityRef.current = 0;
    if (autoScrollRafRef.current !== null) {
      window.cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  const refreshAutoScrollBounds = useCallback(() => {
    const container = autoScrollContainerRef.current;
    if (!container) {
      autoScrollBoundsRef.current = null;
      return;
    }
    const rect = container.getBoundingClientRect();
    autoScrollBoundsRef.current = { top: rect.top, bottom: rect.bottom };
  }, []);

  const resolveIntentFromPointer = useCallback((pointer: PointerPoint): RootShortcutDropIntent | null => {
    const activeSortId = activeDragIdRef.current;
    const rootElement = rootRef.current;
    const session = dragSessionRef.current;
    if (!activeSortId || !rootElement || !session) return null;

    const measuredItems = dragLayoutSnapshot ?? measureGridItems(items, itemElementsRef.current);
    const activeItem = measuredItems.find((item) => item.sortId === activeSortId);
    if (!activeItem) return null;

    const visualCenter = getDragVisualCenter({
      pointer,
      previewOffset: session.previewOffset,
      activeRect: activeItem.rect,
    });
    const rootRect = rootElement.getBoundingClientRect();
    if (
      visualCenter.x < rootRect.left
      || visualCenter.x > rootRect.right
      || visualCenter.y < rootRect.top
      || visualCenter.y > rootRect.bottom
    ) {
      centerHoverCandidateRef.current = null;
      return null;
    }

    const overItem = pickOverItem({
      activeSortId,
      measuredItems,
      pointer: visualCenter,
    });
    if (!overItem) {
      centerHoverCandidateRef.current = null;
      return null;
    }

    const rawIntent = resolveRootDropIntent({
      activeSortId,
      overSortId: overItem.sortId,
      pointer: visualCenter,
      overRect: overItem.rect,
      items,
    });
    if (!rawIntent) {
      centerHoverCandidateRef.current = null;
      return null;
    }

    if (rawIntent.type === 'reorder-root') {
      centerHoverCandidateRef.current = null;
      return rawIntent;
    }

    const currentCandidate = centerHoverCandidateRef.current;
    const nextCandidateType = rawIntent.type;
    const now = window.performance.now();

    if (
      currentCandidate
      && currentCandidate.targetSortId === overItem.sortId
      && currentCandidate.intentType === nextCandidateType
    ) {
      if (now - currentCandidate.startedAt >= CENTER_INTENT_DELAY_MS) {
        return rawIntent;
      }
    } else {
      centerHoverCandidateRef.current = {
        targetSortId: overItem.sortId,
        intentType: nextCandidateType,
        startedAt: now,
      };
    }

    return buildFallbackReorderIntent({
      activeSortId,
      overItem,
      pointer: visualCenter,
      measuredItems,
    });
  }, [dragLayoutSnapshot, items]);

  const syncHoverIntent = useCallback((pointer: PointerPoint) => {
    latestPointerRef.current = pointer;
    setHoverIntent(resolveIntentFromPointer(pointer));
  }, [resolveIntentFromPointer]);

  useEffect(() => {
    if (!externalDragSession) return;
    if (dragSessionRef.current || pendingDragRef.current) return;
    if (consumedExternalDragTokenRef.current === externalDragSession.token) return;

    const activeItem = items.find((item) => item.shortcut.id === externalDragSession.shortcutId);
    if (!activeItem) return;

    const measuredItems = measureGridItems(items, itemElementsRef.current);
    const measuredActiveItem = measuredItems.find((item) => item.sortId === activeItem.sortId);
    if (!measuredActiveItem) return;

    const previewOffset = {
      x: Math.max(0, Math.min(measuredActiveItem.rect.width, measuredActiveItem.rect.width * externalDragSession.anchor.xRatio)),
      y: Math.max(0, Math.min(measuredActiveItem.rect.height, measuredActiveItem.rect.height * externalDragSession.anchor.yRatio)),
    };

    const nextSession: DragSessionState = {
      pointerId: externalDragSession.pointerId,
      pointerType: externalDragSession.pointerType,
      activeId: activeItem.sortId,
      activeSortId: activeItem.sortId,
      pointer: externalDragSession.pointer,
      previewOffset,
    };
    dragSessionRef.current = nextSession;
    latestPointerRef.current = externalDragSession.pointer;
    autoScrollContainerRef.current = findScrollableParent(rootRef.current);
    refreshAutoScrollBounds();
    autoScrollVelocityRef.current = 0;
    document.body.style.userSelect = 'none';
    consumedExternalDragTokenRef.current = externalDragSession.token;

    setDragLayoutSnapshot(measuredItems);
    setDragging(true);
    setActiveDragId(activeItem.sortId);
    setDragPreviewOffset(previewOffset);
    setDragPointer(externalDragSession.pointer);
    syncHoverIntent(externalDragSession.pointer);
    onExternalDragSessionConsumed?.(externalDragSession.token);
  }, [
    externalDragSession,
    items,
    onExternalDragSessionConsumed,
    refreshAutoScrollBounds,
    syncHoverIntent,
  ]);

  const startAutoScrollLoop = useCallback(() => {
    if (autoScrollRafRef.current !== null) return;

    const tick = () => {
      const container = autoScrollContainerRef.current;
      const velocity = autoScrollVelocityRef.current;
      if (!container || Math.abs(velocity) < 0.01) {
        autoScrollRafRef.current = null;
        return;
      }

      const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
      const nextScrollTop = Math.max(0, Math.min(maxScrollTop, container.scrollTop + velocity));
      container.scrollTop = nextScrollTop;

      const pointer = latestPointerRef.current;
      if (pointer) {
        syncHoverIntent(pointer);
      }

      autoScrollRafRef.current = window.requestAnimationFrame(tick);
    };

    autoScrollRafRef.current = window.requestAnimationFrame(tick);
  }, [syncHoverIntent]);

  const updateAutoScrollVelocity = useCallback((clientY: number) => {
    const container = autoScrollContainerRef.current;
    const bounds = autoScrollBoundsRef.current;
    if (!container || !bounds) return;

    let velocity = 0;
    if (clientY < bounds.top + DRAG_AUTO_SCROLL_EDGE_PX) {
      const ratio = Math.min(1, (bounds.top + DRAG_AUTO_SCROLL_EDGE_PX - clientY) / DRAG_AUTO_SCROLL_EDGE_PX);
      velocity = -(DRAG_AUTO_SCROLL_MAX_SPEED_PX * ratio * ratio);
    } else if (clientY > bounds.bottom - DRAG_AUTO_SCROLL_EDGE_PX) {
      const ratio = Math.min(1, (clientY - (bounds.bottom - DRAG_AUTO_SCROLL_EDGE_PX)) / DRAG_AUTO_SCROLL_EDGE_PX);
      velocity = DRAG_AUTO_SCROLL_MAX_SPEED_PX * ratio * ratio;
    }

    autoScrollVelocityRef.current = velocity;
    if (Math.abs(velocity) > 0.01) {
      startAutoScrollLoop();
    } else {
      stopAutoScroll();
    }
  }, [startAutoScrollLoop, stopAutoScroll]);

  const clearDragRuntimeState = useCallback(() => {
    pendingDragRef.current = null;
    dragSessionRef.current = null;
    latestPointerRef.current = null;
    centerHoverCandidateRef.current = null;
    setDragging(false);
    setActiveDragId(null);
    setDragPointer(null);
    setDragPreviewOffset(null);
    setHoverIntent(null);
    setDragLayoutSnapshot(null);
    stopAutoScroll();
    autoScrollContainerRef.current = null;
    autoScrollBoundsRef.current = null;
    document.body.style.userSelect = '';
  }, [stopAutoScroll]);

  const scheduleDragCleanup = useCallback(() => {
    if (dropCleanupRafRef.current !== null) {
      window.cancelAnimationFrame(dropCleanupRafRef.current);
    }

    dropCleanupRafRef.current = window.requestAnimationFrame(() => {
      dropCleanupRafRef.current = null;
      clearDragRuntimeState();
    });
  }, [clearDragRuntimeState]);

  useEffect(() => {
    if (dragging) {
      ignoreClickRef.current = true;
      onDragStart?.();
    } else {
      window.setTimeout(() => {
        ignoreClickRef.current = false;
      }, 120);
      onDragEnd?.();
    }
  }, [dragging, onDragEnd, onDragStart]);

  useEffect(() => () => {
    if (dropCleanupRafRef.current !== null) {
      window.cancelAnimationFrame(dropCleanupRafRef.current);
      dropCleanupRafRef.current = null;
    }
    clearDragRuntimeState();
  }, [clearDragRuntimeState]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      const session = dragSessionRef.current;

      if (pending && event.pointerId === pending.pointerId) {
        const nextPointer = { x: event.clientX, y: event.clientY };
        pending.current = nextPointer;

        if (Math.hypot(nextPointer.x - pending.origin.x, nextPointer.y - pending.origin.y) < DRAG_ACTIVATION_DISTANCE_PX) {
          return;
        }

        const nextSession: DragSessionState = {
          pointerId: pending.pointerId,
          pointerType: pending.pointerType,
          activeId: pending.activeSortId,
          activeSortId: pending.activeSortId,
          pointer: nextPointer,
          previewOffset: pending.previewOffset,
        };
        dragSessionRef.current = nextSession;
        pendingDragRef.current = null;

        if (dropCleanupRafRef.current !== null) {
          window.cancelAnimationFrame(dropCleanupRafRef.current);
          dropCleanupRafRef.current = null;
        }

        autoScrollContainerRef.current = findScrollableParent(rootRef.current);
        refreshAutoScrollBounds();
        autoScrollVelocityRef.current = 0;
        document.body.style.userSelect = 'none';
        setDragLayoutSnapshot(measureGridItems(items, itemElementsRef.current));

        setDragging(true);
        setActiveDragId(nextSession.activeSortId);
        setDragPreviewOffset(nextSession.previewOffset);
        setDragPointer(nextPointer);
        syncHoverIntent(nextPointer);
        event.preventDefault();
        return;
      }

      if (!session || event.pointerId !== session.pointerId) return;

      const nextPointer = { x: event.clientX, y: event.clientY };
      session.pointer = nextPointer;
      setDragPointer(nextPointer);
      updateAutoScrollVelocity(nextPointer.y);
      syncHoverIntent(nextPointer);
      event.preventDefault();
    };

    const finishPointerInteraction = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      const session = dragSessionRef.current;

      if (pending && event.pointerId === pending.pointerId) {
        pendingDragRef.current = null;
        return;
      }

      if (!session || event.pointerId !== session.pointerId) return;

      const finalIntent = hoverIntentRef.current;
      if (!finalIntent) {
        clearDragRuntimeState();
        return;
      }

      if (onShortcutDropIntent) {
        onShortcutDropIntent(finalIntent);
        scheduleDragCleanup();
        return;
      }

      if (finalIntent.type !== 'reorder-root') {
        scheduleDragCleanup();
        return;
      }
      const activeIndex = items.findIndex((item) => item.shortcut.id === finalIntent.activeShortcutId);
      if (activeIndex < 0) {
        clearDragRuntimeState();
        return;
      }
      const next = [...items];
      const [moved] = next.splice(activeIndex, 1);
      next.splice(finalIntent.targetIndex, 0, moved);
      onShortcutReorder(next.map((item) => item.shortcut));
      scheduleDragCleanup();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', finishPointerInteraction, { passive: true });
    window.addEventListener('pointercancel', finishPointerInteraction, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishPointerInteraction);
      window.removeEventListener('pointercancel', finishPointerInteraction);
    };
  }, [
    clearDragRuntimeState,
    items,
    onShortcutDropIntent,
    onShortcutReorder,
    refreshAutoScrollBounds,
    scheduleDragCleanup,
    syncHoverIntent,
    updateAutoScrollVelocity,
  ]);

  return (
    <div
      ref={rootRef}
      className="relative w-full"
      data-testid="shortcut-grid"
      style={{
        minHeight: Math.max(containerHeight, gridMinHeight),
        paddingBottom: Math.max(0, bottomInset),
      }}
      onContextMenu={onGridContextMenu}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${Math.max(gridColumns, 1)}, minmax(0, 1fr))`,
          columnGap: compactLayout ? '12px' : '8px',
          rowGap: `${rowGap}px`,
          touchAction: 'pan-y',
        }}
      >
        {items.map((item) => (
          <ShortcutGridItem
            key={item.sortId}
            sortId={item.sortId}
            shortcut={item.shortcut}
            activeDragId={activeDragId}
            hoverState={hoverState}
            cardVariant={cardVariant}
            gridColumns={gridColumns}
            compactShowTitle={compactShowTitle}
            compactIconSize={compactIconSize}
            iconCornerRadius={iconCornerRadius}
            compactTitleFontSize={compactTitleFontSize}
            defaultIconSize={defaultIconSize}
            defaultTitleFontSize={defaultTitleFontSize}
            defaultUrlFontSize={defaultUrlFontSize}
            defaultVerticalPadding={defaultVerticalPadding}
            forceTextWhite={forceTextWhite}
            onPointerDown={(event) => {
              if (selectionMode) return;
              if (event.button !== 0) return;
              if (!event.isPrimary) return;

              const rect = event.currentTarget.getBoundingClientRect();
              pendingDragRef.current = {
                pointerId: event.pointerId,
                pointerType: event.pointerType,
                activeId: item.sortId,
                activeSortId: item.sortId,
                origin: { x: event.clientX, y: event.clientY },
                current: { x: event.clientX, y: event.clientY },
                previewOffset: {
                  x: Math.max(0, event.clientX - rect.left),
                  y: Math.max(0, event.clientY - rect.top),
                },
              };
            }}
            onOpen={() => {
              if (ignoreClickRef.current) return;
              if (selectionMode) {
                onToggleShortcutSelection?.(item.shortcutIndex);
                return;
              }
              onShortcutOpen(item.shortcut);
            }}
            onContextMenu={(event) => {
              if (!ignoreClickRef.current) {
                onShortcutContextMenu(event, item.shortcutIndex, item.shortcut);
              }
            }}
            selected={Boolean(selectedShortcutIndexes?.has(item.shortcutIndex))}
            selectionMode={selectionMode}
            dragDisabled={selectionMode}
            disableReorderAnimation={disableReorderAnimation}
            firefox={firefox}
            projectionOffset={projectionOffsets.get(item.sortId) ?? null}
            registerItemElement={(element) => {
              if (element) {
                itemElementsRef.current.set(item.sortId, element);
                return;
              }
              itemElementsRef.current.delete(item.sortId);
            }}
          />
        ))}
      </div>
      {typeof document !== 'undefined' && activeDragItem && dragPointer && dragPreviewOffset ? createPortal(
        <div
          className="pointer-events-none fixed left-0 top-0"
          style={{
            zIndex: DRAG_OVERLAY_Z_INDEX,
            transform: overlaySnapPosition
              ? `translate(${overlaySnapPosition.left}px, ${overlaySnapPosition.top}px)`
              : `translate(${dragPointer.x - dragPreviewOffset.x}px, ${dragPointer.y - dragPreviewOffset.y}px)`,
            transition: overlaySnapPosition ? 'transform 120ms ease-out' : undefined,
          }}
        >
          {firefox ? (
            <LightweightDragPreview
              shortcut={activeDragItem.shortcut}
              cardVariant={cardVariant}
              firefox={firefox}
              compactShowTitle={compactShowTitle}
              compactIconSize={compactIconSize}
              iconCornerRadius={iconCornerRadius}
              compactTitleFontSize={compactTitleFontSize}
              defaultIconSize={defaultIconSize}
              defaultTitleFontSize={defaultTitleFontSize}
              defaultUrlFontSize={defaultUrlFontSize}
              defaultVerticalPadding={defaultVerticalPadding}
              forceTextWhite={forceTextWhite}
            />
          ) : (
            <ShortcutCardRenderer
              variant={cardVariant}
              compactShowTitle={compactShowTitle}
              compactIconSize={compactIconSize}
              iconCornerRadius={iconCornerRadius}
              compactTitleFontSize={compactTitleFontSize}
              defaultIconSize={defaultIconSize}
              defaultTitleFontSize={defaultTitleFontSize}
              defaultUrlFontSize={defaultUrlFontSize}
              defaultVerticalPadding={defaultVerticalPadding}
              forceTextWhite={forceTextWhite}
              shortcut={activeDragItem.shortcut}
              onOpen={() => {}}
              onContextMenu={() => {}}
            />
          )}
        </div>,
        document.body,
      ) : null}
    </div>
  );
});
