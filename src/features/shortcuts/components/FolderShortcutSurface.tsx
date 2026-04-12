import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Shortcut } from '@/types';
import { ShortcutCardCompact } from '@/components/shortcuts/ShortcutCardCompact';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import { DraggableShortcutItemFrame } from '@/features/shortcuts/components/DraggableShortcutItemFrame';
import { getDropEdge, getReorderTargetIndex } from '@/features/shortcuts/drag/dropEdge';
import type { FolderShortcutDropIntent, RootDropEdge } from '@/features/shortcuts/drag/types';
import {
  buildReorderProjectionOffsets as buildSharedReorderProjectionOffsets,
  measureDragItems,
  pickClosestMeasuredItem,
  pointInRect,
  type ActivePointerDragState,
  type MeasuredDragItem,
  type PendingPointerDragState,
  type PointerPoint,
  type ProjectionOffset,
} from '@/features/shortcuts/drag/gridDragEngine';

type FolderShortcutSurfaceProps = {
  folderId: string;
  shortcuts: Shortcut[];
  emptyText: string;
  iconCornerRadius?: number;
  forceTextWhite?: boolean;
  showShortcutTitles?: boolean;
  maskBoundaryRef: React.RefObject<HTMLElement | null>;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu?: (event: React.MouseEvent<HTMLDivElement>, shortcut: Shortcut) => void;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
  onDragActiveChange?: (active: boolean) => void;
};

export type FolderExtractDragStartPayload = {
  folderId: string;
  shortcutId: string;
  pointerId: number;
  pointerType: string;
  pointer: { x: number; y: number };
  anchor: {
    xRatio: number;
    yRatio: number;
  };
};

type FolderHoverState =
  | { type: 'item'; shortcutId: string; edge: Exclude<RootDropEdge, 'center'> }
  | { type: 'mask' }
  | null;

type PendingDragState = PendingPointerDragState<string> & {
  activeShortcutId: string;
  activeShortcutIndex: number;
};

type DragSessionState = ActivePointerDragState<string> & {
  activeShortcutId: string;
  activeShortcutIndex: number;
};

type MeasuredFolderItem = MeasuredDragItem<{
  shortcut: Shortcut;
  shortcutIndex: number;
}>;

const DRAG_ACTIVATION_DISTANCE_PX = 8;
const DRAG_MATCH_DISTANCE_PX = 72;
const EXTRACT_HANDOFF_DELAY_MS = 520;
const DRAG_OVERLAY_Z_INDEX = 2147483000;

function buildReorderProjectionOffsets(params: {
  shortcuts: Shortcut[];
  layoutSnapshot: MeasuredFolderItem[] | null;
  activeShortcutId: string | null;
  hoverState: FolderHoverState;
}): Map<string, ProjectionOffset> {
  const { shortcuts, layoutSnapshot, activeShortcutId, hoverState } = params;
  if (hoverState?.type !== 'item') {
    return new Map<string, ProjectionOffset>();
  }

  const items = shortcuts.map((shortcut, shortcutIndex) => ({ shortcut, shortcutIndex }));

  const activeIndex = shortcuts.findIndex((shortcut) => shortcut.id === activeShortcutId);
  const overIndex = shortcuts.findIndex((shortcut) => shortcut.id === hoverState.shortcutId);
  const targetIndex = activeIndex < 0 || overIndex < 0
    ? null
    : getReorderTargetIndex(activeIndex, overIndex, hoverState.edge);

  return buildSharedReorderProjectionOffsets({
    items,
    layoutSnapshot,
    activeId: activeShortcutId,
    hoveredId: hoverState.shortcutId,
    targetIndex,
    getId: (item) => item.shortcut.id,
  });
}

function measureFolderItems(
  shortcuts: Shortcut[],
  itemElements: Map<string, HTMLDivElement>,
): MeasuredFolderItem[] {
  return measureDragItems({
    items: shortcuts.map((shortcut, shortcutIndex) => ({ shortcut, shortcutIndex })),
    itemElements,
    getId: (item) => item.shortcut.id,
  });
}

function pickOverItem(params: {
  activeShortcutId: string;
  measuredItems: MeasuredFolderItem[];
  pointer: PointerPoint;
}): MeasuredFolderItem | null {
  const { activeShortcutId, measuredItems, pointer } = params;
  return pickClosestMeasuredItem({
    activeId: activeShortcutId,
    measuredItems,
    pointer,
    getId: (item) => item.shortcut.id,
    maxDistance: DRAG_MATCH_DISTANCE_PX,
  });
}

function FolderMaskDropZones({
  active,
  hovered,
  boundaryRef,
}: {
  active: boolean;
  hovered: boolean;
  boundaryRef: React.RefObject<HTMLElement | null>;
}) {
  const [boundaryRect, setBoundaryRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active) {
      setBoundaryRect(null);
      return;
    }

    const updateRect = () => {
      const node = boundaryRef.current;
      setBoundaryRect(node ? node.getBoundingClientRect() : null);
    };

    updateRect();
    window.addEventListener('resize', updateRect, { passive: true });
    window.addEventListener('scroll', updateRect, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [active, boundaryRef]);

  if (!active || !boundaryRect || typeof document === 'undefined') return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const zoneClassName = hovered ? 'bg-primary/12' : 'bg-background/4';

  return createPortal(
    <>
      <div className={`pointer-events-none fixed left-0 top-0 z-[51] transition-colors ${zoneClassName}`} style={{ width: viewportWidth, height: Math.max(0, boundaryRect.top) }} />
      <div className={`pointer-events-none fixed z-[51] transition-colors ${zoneClassName}`} style={{ left: Math.max(0, boundaryRect.right), top: Math.max(0, boundaryRect.top), width: Math.max(0, viewportWidth - boundaryRect.right), height: Math.max(0, boundaryRect.height) }} />
      <div className={`pointer-events-none fixed left-0 z-[51] transition-colors ${zoneClassName}`} style={{ top: Math.max(0, boundaryRect.bottom), width: viewportWidth, height: Math.max(0, viewportHeight - boundaryRect.bottom) }} />
      <div className={`pointer-events-none fixed z-[51] transition-colors ${zoneClassName}`} style={{ left: 0, top: Math.max(0, boundaryRect.top), width: Math.max(0, boundaryRect.left), height: Math.max(0, boundaryRect.height) }} />
    </>,
    document.body,
  );
}

function FloatingFolderShortcutPreview({
  shortcut,
  pointer,
  previewOffset,
  iconCornerRadius,
  forceTextWhite,
}: {
  shortcut: Shortcut;
  pointer: PointerPoint;
  previewOffset: PointerPoint;
  iconCornerRadius?: number;
  forceTextWhite?: boolean;
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="pointer-events-none fixed left-0 top-0 isolate"
      style={{
        zIndex: DRAG_OVERLAY_Z_INDEX,
        transform: `translate3d(${pointer.x - previewOffset.x}px, ${pointer.y - previewOffset.y}px, 0)`,
      }}
    >
      <ShortcutCardCompact
        shortcut={shortcut}
        showTitle
        iconSize={72}
        iconCornerRadius={iconCornerRadius}
        titleFontSize={12}
        forceTextWhite={forceTextWhite}
        onOpen={() => {}}
        onContextMenu={() => {}}
      />
    </div>,
    document.body,
  );
}

export function FolderShortcutSurface({
  folderId,
  shortcuts,
  emptyText,
  iconCornerRadius,
  forceTextWhite = false,
  showShortcutTitles = true,
  maskBoundaryRef,
  onShortcutOpen,
  onShortcutContextMenu,
  onShortcutDropIntent,
  onExtractDragStart,
  onDragActiveChange,
}: FolderShortcutSurfaceProps) {
  const firefox = isFirefoxBuildTarget();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragPointer, setDragPointer] = useState<PointerPoint | null>(null);
  const [dragPreviewOffset, setDragPreviewOffset] = useState<PointerPoint | null>(null);
  const [hoverState, setHoverState] = useState<FolderHoverState>(null);
  const itemElementsRef = useRef(new Map<string, HTMLDivElement>());
  const ignoreClickRef = useRef(false);
  const pendingDragRef = useRef<PendingDragState | null>(null);
  const dragSessionRef = useRef<DragSessionState | null>(null);
  const latestHoverStateRef = useRef<FolderHoverState>(null);
  const extractHandoffTimerRef = useRef<number | null>(null);
  const latestPointerRef = useRef<PointerPoint | null>(null);
  const [dragLayoutSnapshot, setDragLayoutSnapshot] = useState<MeasuredFolderItem[] | null>(null);

  const activeDragShortcut = useMemo(
    () => shortcuts.find((shortcut) => shortcut.id === activeDragId) ?? null,
    [activeDragId, shortcuts],
  );

  const projectionOffsets = useMemo(
    () => buildReorderProjectionOffsets({
      shortcuts,
      layoutSnapshot: dragLayoutSnapshot,
      activeShortcutId: activeDragId,
      hoverState,
    }),
    [activeDragId, dragLayoutSnapshot, hoverState, shortcuts],
  );

  useEffect(() => {
    latestHoverStateRef.current = hoverState;
  }, [hoverState]);

  useEffect(() => {
    if (!activeDragId) {
      window.setTimeout(() => {
        ignoreClickRef.current = false;
      }, 120);
      onDragActiveChange?.(false);
      return;
    }

    ignoreClickRef.current = true;
    onDragActiveChange?.(true);
  }, [activeDragId, onDragActiveChange]);

  const clearDragState = useCallback(() => {
    if (extractHandoffTimerRef.current !== null) {
      window.clearTimeout(extractHandoffTimerRef.current);
      extractHandoffTimerRef.current = null;
    }
    pendingDragRef.current = null;
    dragSessionRef.current = null;
    latestPointerRef.current = null;
    setActiveDragId(null);
    setDragPointer(null);
    setDragPreviewOffset(null);
    setDragLayoutSnapshot(null);
    setHoverState(null);
    document.body.style.userSelect = '';
  }, []);

  const performExtractHandoff = useCallback((pointer: PointerPoint) => {
    const session = dragSessionRef.current;
    if (!session) return;

    const activeItem = (dragLayoutSnapshot ?? measureFolderItems(shortcuts, itemElementsRef.current))
      .find((item) => item.shortcut.id === session.activeShortcutId);
    if (!activeItem) return;

    const anchor = {
      xRatio: activeItem.rect.width > 0 ? session.previewOffset.x / activeItem.rect.width : 0.5,
      yRatio: activeItem.rect.height > 0 ? session.previewOffset.y / activeItem.rect.height : 0.5,
    };

    clearDragState();
    onExtractDragStart?.({
      folderId,
      shortcutId: activeItem.shortcut.id,
      pointerId: session.pointerId,
      pointerType: session.pointerType,
      pointer,
      anchor,
    });
  }, [clearDragState, dragLayoutSnapshot, folderId, onExtractDragStart, shortcuts]);

  const clearExtractHandoffTimer = useCallback(() => {
    if (extractHandoffTimerRef.current !== null) {
      window.clearTimeout(extractHandoffTimerRef.current);
      extractHandoffTimerRef.current = null;
    }
  }, []);

  const ensureExtractHandoffTimer = useCallback(() => {
    if (extractHandoffTimerRef.current !== null) return;

    extractHandoffTimerRef.current = window.setTimeout(() => {
      extractHandoffTimerRef.current = null;
      const pointer = latestPointerRef.current;
      if (pointer) {
        performExtractHandoff(pointer);
      }
    }, EXTRACT_HANDOFF_DELAY_MS);
  }, [performExtractHandoff]);

  const resolveHoverState = useCallback((pointer: PointerPoint): FolderHoverState => {
    const session = dragSessionRef.current;
    if (!session) return null;

    latestPointerRef.current = pointer;
    const measuredItems = dragLayoutSnapshot ?? measureFolderItems(shortcuts, itemElementsRef.current);
    const activeItem = measuredItems.find((item) => item.shortcut.id === session.activeShortcutId);
    if (!activeItem) return null;

    const boundaryRect = maskBoundaryRef.current?.getBoundingClientRect() ?? null;
    if (boundaryRect && !pointInRect(pointer, boundaryRect)) {
      ensureExtractHandoffTimer();
      return { type: 'mask' };
    }

    clearExtractHandoffTimer();
    const overItem = pickOverItem({
      activeShortcutId: session.activeShortcutId,
      measuredItems,
      pointer,
    });
    if (!overItem) return null;

    const edge = getDropEdge(pointer, overItem.rect);
    return {
      type: 'item',
      shortcutId: overItem.shortcut.id,
      edge: edge === 'center' ? 'after' : edge,
    };
  }, [clearExtractHandoffTimer, dragLayoutSnapshot, ensureExtractHandoffTimer, maskBoundaryRef, shortcuts]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      const session = dragSessionRef.current;

      if (pending && event.pointerId === pending.pointerId) {
        const pointer = { x: event.clientX, y: event.clientY };
        if (Math.hypot(pointer.x - pending.origin.x, pointer.y - pending.origin.y) < DRAG_ACTIVATION_DISTANCE_PX) {
          return;
        }

        const nextSession: DragSessionState = {
          pointerId: pending.pointerId,
          pointerType: pending.pointerType,
          activeId: pending.activeShortcutId,
          activeShortcutId: pending.activeShortcutId,
          activeShortcutIndex: pending.activeShortcutIndex,
          pointer,
          previewOffset: pending.previewOffset,
        };
        dragSessionRef.current = nextSession;
        pendingDragRef.current = null;
        setDragLayoutSnapshot(measureFolderItems(shortcuts, itemElementsRef.current));
        document.body.style.userSelect = 'none';
        setActiveDragId(nextSession.activeShortcutId);
        setDragPreviewOffset(nextSession.previewOffset);
        setDragPointer(pointer);
        setHoverState(resolveHoverState(pointer));
        event.preventDefault();
        return;
      }

      if (!session || event.pointerId !== session.pointerId) return;

      const pointer = { x: event.clientX, y: event.clientY };
      session.pointer = pointer;
      setDragPointer(pointer);
      setHoverState(resolveHoverState(pointer));
      event.preventDefault();
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      const session = dragSessionRef.current;
      if (pending && event.pointerId === pending.pointerId) {
        pendingDragRef.current = null;
        return;
      }
      if (!session || event.pointerId !== session.pointerId) return;

      const finalHoverState = latestHoverStateRef.current;
      const activeShortcutId = session.activeShortcutId;
      const activeShortcutIndex = session.activeShortcutIndex;
      clearDragState();

      if (!finalHoverState) return;

      if (finalHoverState.type === 'mask') {
        return;
      }

      const targetShortcutIndex = shortcuts.findIndex((shortcut) => shortcut.id === finalHoverState.shortcutId);
      if (targetShortcutIndex < 0) return;

      const targetIndex = getReorderTargetIndex(activeShortcutIndex, targetShortcutIndex, finalHoverState.edge);
      if (targetIndex === activeShortcutIndex) return;

      onShortcutDropIntent({
        type: 'reorder-folder-shortcuts',
        folderId,
        shortcutId: activeShortcutId,
        targetIndex,
        edge: finalHoverState.edge,
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerEnd, { passive: true });
    window.addEventListener('pointercancel', handlePointerEnd, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [clearDragState, folderId, onShortcutDropIntent, resolveHoverState, shortcuts]);

  useEffect(() => () => {
    onDragActiveChange?.(false);
    clearDragState();
  }, [clearDragState, onDragActiveChange]);

  if (shortcuts.length === 0) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-dashed border-border/80 bg-secondary/20 text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  const hoveredMask = hoverState?.type === 'mask';

  return (
    <>
      <FolderMaskDropZones
        active={Boolean(activeDragId)}
        hovered={hoveredMask}
        boundaryRef={maskBoundaryRef}
      />
      <div
        className="grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-4"
        data-folder-shortcut-grid="true"
      >
        {shortcuts.map((shortcut, shortcutIndex) => {
          const isDragging = activeDragId === shortcut.id;
          const projectionOffset = projectionOffsets.get(shortcut.id) ?? null;

          return (
            <div
              key={shortcut.id}
              className="relative flex justify-center"
              data-folder-shortcut-grid-item="true"
            >
              <DraggableShortcutItemFrame
                cardVariant="compact"
                compactIconSize={72}
                iconCornerRadius={iconCornerRadius ?? 22}
                defaultPlaceholderHeight={96}
                isDragging={isDragging}
                hideDragPlaceholder
                projectionOffset={projectionOffset}
                firefox={firefox}
                registerElement={(element) => {
                  if (element) {
                    itemElementsRef.current.set(shortcut.id, element);
                    return;
                  }
                  itemElementsRef.current.delete(shortcut.id);
                }}
                onPointerDown={(event) => {
                  if (event.button !== 0 || !event.isPrimary) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  pendingDragRef.current = {
                    pointerId: event.pointerId,
                    pointerType: event.pointerType,
                    activeId: shortcut.id,
                    activeShortcutId: shortcut.id,
                    activeShortcutIndex: shortcutIndex,
                    origin: { x: event.clientX, y: event.clientY },
                    previewOffset: {
                      x: Math.max(0, event.clientX - rect.left),
                      y: Math.max(0, event.clientY - rect.top),
                    },
                  };
                }}
                frameProps={{
                  'data-testid': `folder-shortcut-card-${shortcut.id}`,
                  'data-folder-shortcut-id': shortcut.id,
                }}
              >
                <ShortcutCardCompact
                  shortcut={shortcut}
                  showTitle={showShortcutTitles}
                  iconSize={72}
                  iconCornerRadius={iconCornerRadius}
                  titleFontSize={12}
                  forceTextWhite={forceTextWhite}
                  disableIconWrapperEffects
                  iconContentProps={{
                    'data-folder-overlay-child-id': shortcut.id,
                  }}
                  onOpen={() => {
                    if (ignoreClickRef.current) return;
                    onShortcutOpen(shortcut);
                  }}
                  onContextMenu={(event) => {
                    if (ignoreClickRef.current) return;
                    onShortcutContextMenu?.(event, shortcut);
                  }}
                />
              </DraggableShortcutItemFrame>
            </div>
          );
        })}
      </div>
      {activeDragShortcut && dragPointer && dragPreviewOffset ? (
        <FloatingFolderShortcutPreview
          shortcut={activeDragShortcut}
          pointer={dragPointer}
          previewOffset={dragPreviewOffset}
          iconCornerRadius={iconCornerRadius}
          forceTextWhite={forceTextWhite}
        />
      ) : null}
    </>
  );
}
