import {
  type FolderShortcutDropIntent,
  type FolderExtractDragStartPayload,
  type GridInteractionProfileLike,
  type RootShortcutDropIntent,
  type ShortcutExternalDragSessionSeed,
} from '@leaftab/workspace-react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import { ShortcutIconRenderContext, type ShortcutMonochromeTone } from '@/components/ShortcutIconRenderContext';
import { RootShortcutGrid } from './RootShortcutGrid';
import { renderLeaftabFolderEmptyState } from './leaftabGridVisuals';

export type { FolderExtractDragStartPayload } from '@leaftab/workspace-react';

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

type FolderShortcutSurfaceProps = {
  folderId: string;
  shortcuts: Shortcut[];
  emptyText: string;
  compactIconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  forceTextWhite?: boolean;
  showShortcutTitles?: boolean;
  maskBoundaryRef: React.RefObject<HTMLElement | null>;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu?: (event: React.MouseEvent<HTMLDivElement>, shortcut: Shortcut) => void;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  interactionProfile?: GridInteractionProfileLike;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
  onDragActiveChange?: (active: boolean) => void;
};

export function FolderShortcutSurface({
  folderId,
  shortcuts,
  emptyText,
  compactIconSize = 72,
  iconCornerRadius,
  iconAppearance,
  forceTextWhite = false,
  showShortcutTitles = true,
  maskBoundaryRef,
  onShortcutOpen,
  onShortcutContextMenu,
  onShortcutDropIntent,
  interactionProfile = 'folder-internal',
  onExtractDragStart,
  onDragActiveChange,
}: FolderShortcutSurfaceProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);
  const [folderDragActive, setFolderDragActive] = useState(false);
  const [hoveredMask, setHoveredMask] = useState(false);
  const shortcutIconRenderContextValue = useMemo(() => ({
    monochromeTone: 'theme-adaptive' as ShortcutMonochromeTone,
    monochromeTileBackdropBlur: false,
  }), []);

  useLayoutEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return;
    }

    const updateColumns = () => {
      const nextColumns = node.clientWidth >= 640 ? 4 : 3;
      setColumns((current) => (current === nextColumns ? current : nextColumns));
    };

    updateColumns();
    const observer = new ResizeObserver(() => {
      updateColumns();
    });
    observer.observe(node);
    window.addEventListener('resize', updateColumns, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateColumns);
    };
  }, []);

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
    setFolderDragActive(true);
    onDragActiveChange?.(true);
  }, [onDragActiveChange]);

  const handleDragEnd = useCallback(() => {
    setFolderDragActive(false);
    setHoveredMask(false);
    onDragActiveChange?.(false);
  }, [onDragActiveChange]);

  const handleBoundaryHoverChange = useCallback((hovered: boolean) => {
    setHoveredMask(hovered);
  }, []);

  const handleGridContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleShortcutReorder = useCallback((_nextShortcuts: Shortcut[]) => {
    // Reorders are submitted via onShortcutDropIntent so folder state stays in the host model.
  }, []);

  if (shortcuts.length === 0) {
    return (
      <ShortcutIconRenderContext.Provider value={shortcutIconRenderContextValue}>
        <div ref={wrapperRef} className="relative">
          {renderLeaftabFolderEmptyState(emptyText)}
        </div>
      </ShortcutIconRenderContext.Provider>
    );
  }

  return (
    <ShortcutIconRenderContext.Provider value={shortcutIconRenderContextValue}>
      <div ref={wrapperRef} className="relative">
        <FolderMaskDropZones
          active={folderDragActive}
          hovered={hoveredMask}
          boundaryRef={maskBoundaryRef}
        />
        <RootShortcutGrid
          containerHeight={0}
          shortcuts={shortcuts}
          gridColumns={columns}
          minRows={1}
          onShortcutOpen={onShortcutOpen}
          onShortcutContextMenu={(event, _shortcutIndex, shortcut) => {
            onShortcutContextMenu?.(event, shortcut);
          }}
          onShortcutReorder={handleShortcutReorder}
          onShortcutDropIntent={handleRootDropIntent}
          onGridContextMenu={handleGridContextMenu}
          compactShowTitle={showShortcutTitles}
          compactIconSize={compactIconSize}
          iconCornerRadius={iconCornerRadius}
          iconAppearance={iconAppearance}
          forceTextWhite={forceTextWhite}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          interactionProfile={interactionProfile}
          extractBoundaryRef={maskBoundaryRef}
          onExtractDragStart={handleExtractDragStart}
          onBoundaryHoverChange={handleBoundaryHoverChange}
        />
      </div>
    </ShortcutIconRenderContext.Provider>
  );
}
