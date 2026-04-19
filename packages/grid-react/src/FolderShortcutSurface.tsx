import {
  type FolderExtractDragStartPayload,
  type FolderShortcutDropIntent,
  type GridInteractionProfileLike,
  type RootShortcutDropIntent,
  type Shortcut,
  type ShortcutExternalDragSessionSeed,
} from '@leaftab/workspace-core';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  RootShortcutGrid,
  type RootShortcutGridDropTargetRects,
  type RootShortcutGridHeatZone,
  type RootShortcutGridHeatZoneInspector,
  type RootShortcutGridItemLayout,
  type RootShortcutGridRenderDragPreviewParams,
  type RootShortcutGridRenderDropPreviewParams,
} from './RootShortcutGrid';

export type FolderShortcutSurfaceItemLayout = RootShortcutGridItemLayout;

export type FolderShortcutSurfaceRenderItemParams = {
  shortcut: Shortcut;
  shortcutIndex: number;
  isDragging: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
};

export type FolderShortcutSurfaceRenderDragPreviewParams =
  RootShortcutGridRenderDragPreviewParams;

export type FolderShortcutSurfaceRenderDropPreviewParams = {
  shortcut: Shortcut;
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
};

export type FolderShortcutSurfaceHeatZone = RootShortcutGridHeatZone;

export type FolderShortcutSurfaceHeatZoneInspector = RootShortcutGridHeatZoneInspector;

export interface FolderShortcutSurfaceProps {
  folderId: string;
  shortcuts: Shortcut[];
  emptyText?: string;
  renderEmptyState?: () => React.ReactNode;
  columns?: number;
  cellSize?: number;
  columnGap?: number;
  rowGap?: number;
  overlayZIndex?: number;
  maskBoundaryRef: React.RefObject<HTMLElement | null>;
  resolveItemLayout: (shortcut: Shortcut) => FolderShortcutSurfaceItemLayout;
  renderItem: (params: FolderShortcutSurfaceRenderItemParams) => React.ReactNode;
  renderDragPreview: (params: FolderShortcutSurfaceRenderDragPreviewParams) => React.ReactNode;
  renderDropPreview?: (params: FolderShortcutSurfaceRenderDropPreviewParams) => React.ReactNode;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu?: (event: React.MouseEvent<HTMLDivElement>, shortcut: Shortcut) => void;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  interactionProfile?: GridInteractionProfileLike;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
  onDragActiveChange?: (active: boolean) => void;
  onHeatZoneInspectorChange?: (inspector: FolderShortcutSurfaceHeatZoneInspector | null) => void;
  isFirefox?: boolean;
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

  if (!active || !boundaryRect || typeof document === 'undefined') {
    return null;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const zoneClassName = hovered ? 'bg-black/10' : 'bg-black/5';

  return createPortal(
    <>
      <div
        className={`pointer-events-none fixed left-0 top-0 z-[51] transition-colors ${zoneClassName}`}
        style={{ width: viewportWidth, height: Math.max(0, boundaryRect.top) }}
      />
      <div
        className={`pointer-events-none fixed z-[51] transition-colors ${zoneClassName}`}
        style={{
          left: Math.max(0, boundaryRect.right),
          top: Math.max(0, boundaryRect.top),
          width: Math.max(0, viewportWidth - boundaryRect.right),
          height: Math.max(0, boundaryRect.height),
        }}
      />
      <div
        className={`pointer-events-none fixed left-0 z-[51] transition-colors ${zoneClassName}`}
        style={{
          top: Math.max(0, boundaryRect.bottom),
          width: viewportWidth,
          height: Math.max(0, viewportHeight - boundaryRect.bottom),
        }}
      />
      <div
        className={`pointer-events-none fixed z-[51] transition-colors ${zoneClassName}`}
        style={{
          left: 0,
          top: Math.max(0, boundaryRect.top),
          width: Math.max(0, boundaryRect.left),
          height: Math.max(0, boundaryRect.height),
        }}
      />
    </>,
    document.body,
  );
}

function renderDefaultDropPreview(params: FolderShortcutSurfaceRenderDropPreviewParams) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-0 bg-black/10"
      style={{
        left: params.left,
        top: params.top,
        width: params.width,
        height: params.height,
        borderRadius: params.borderRadius ?? '18px',
      }}
    />
  );
}

export function FolderShortcutSurface({
  folderId,
  shortcuts,
  emptyText = '',
  renderEmptyState,
  columns = 3,
  cellSize,
  columnGap = 16,
  rowGap = 20,
  overlayZIndex,
  maskBoundaryRef,
  resolveItemLayout,
  renderItem,
  renderDragPreview,
  renderDropPreview = renderDefaultDropPreview,
  onShortcutOpen,
  onShortcutContextMenu,
  onShortcutDropIntent,
  interactionProfile = 'folder-internal',
  onExtractDragStart,
  onDragActiveChange,
  onHeatZoneInspectorChange,
  isFirefox,
}: FolderShortcutSurfaceProps) {
  const [dragActive, setDragActive] = useState(false);
  const [hoveredMask, setHoveredMask] = useState(false);
  const rowHeight = useMemo(() => {
    if (cellSize) {
      return cellSize;
    }

    const firstShortcut = shortcuts[0];
    if (!firstShortcut) {
      return 1;
    }

    return Math.max(1, resolveItemLayout(firstShortcut).height);
  }, [cellSize, resolveItemLayout, shortcuts]);

  const handleRootDropIntent = useCallback((intent: RootShortcutDropIntent) => {
    if (intent.type !== 'reorder-root') {
      return;
    }

    onShortcutDropIntent({
      type: 'reorder-folder-shortcuts',
      folderId,
      shortcutId: intent.activeShortcutId,
      targetIndex: intent.targetIndex,
      edge: intent.edge,
    });
  }, [folderId, onShortcutDropIntent]);

  const handleExtractDragStart = useCallback((payload: ShortcutExternalDragSessionSeed) => {
    onExtractDragStart?.({
      folderId,
      shortcutId: payload.shortcutId,
      pointerId: payload.pointerId,
      pointerType: payload.pointerType,
      pointer: payload.pointer,
      anchor: payload.anchor,
    });
  }, [folderId, onExtractDragStart]);

  const handleDragStart = useCallback(() => {
    setDragActive(true);
    onDragActiveChange?.(true);
  }, [onDragActiveChange]);

  const handleDragEnd = useCallback(() => {
    setDragActive(false);
    setHoveredMask(false);
    onDragActiveChange?.(false);
  }, [onDragActiveChange]);

  const handleGridContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleShortcutReorder = useCallback((_nextShortcuts: Shortcut[]) => {
    // Reorders are committed through onShortcutDropIntent so the host remains authoritative.
  }, []);

  const adaptDropPreview = useCallback((params: RootShortcutGridRenderDropPreviewParams) => (
    renderDropPreview({
      shortcut: params.shortcut,
      left: params.left,
      top: params.top,
      width: params.width,
      height: params.height,
      borderRadius: params.borderRadius,
    })
  ), [renderDropPreview]);

  const resolveDropTargetRects = useCallback((params: {
    rect: DOMRect;
  }): RootShortcutGridDropTargetRects => ({
    overRect: params.rect,
    overCenterRect: undefined,
  }), []);

  if (shortcuts.length === 0) {
    if (renderEmptyState) {
      return <>{renderEmptyState()}</>;
    }

    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-dashed border-black/15 bg-black/5 text-sm text-black/55">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="relative">
      <FolderMaskDropZones
        active={dragActive}
        hovered={hoveredMask}
        boundaryRef={maskBoundaryRef}
      />
      <RootShortcutGrid
        containerHeight={0}
        shortcuts={shortcuts}
        gridColumns={columns}
        minRows={1}
        rowHeight={rowHeight}
        rowGap={rowGap}
        columnGap={columnGap}
        overlayZIndex={overlayZIndex}
        resolveItemLayout={resolveItemLayout}
        onShortcutOpen={onShortcutOpen}
        onShortcutContextMenu={(event, _shortcutIndex, shortcut) => {
          onShortcutContextMenu?.(event, shortcut);
        }}
        onShortcutReorder={handleShortcutReorder}
        onShortcutDropIntent={handleRootDropIntent}
        onGridContextMenu={handleGridContextMenu}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onHeatZoneInspectorChange={onHeatZoneInspectorChange}
        interactionProfile={interactionProfile}
        extractBoundaryRef={maskBoundaryRef}
        onExtractDragStart={onExtractDragStart ? handleExtractDragStart : undefined}
        onBoundaryHoverChange={setHoveredMask}
        isFirefox={isFirefox}
        resolveDropTargetRects={(params) => resolveDropTargetRects({ rect: params.rect })}
        renderItem={(params) => renderItem({
          shortcut: params.shortcut,
          shortcutIndex: params.shortcutIndex,
          isDragging: params.isDragging,
          onOpen: params.onOpen,
          onContextMenu: params.onContextMenu,
        })}
        renderDragPreview={renderDragPreview}
        renderDropPreview={adaptDropPreview}
      />
    </div>
  );
}
