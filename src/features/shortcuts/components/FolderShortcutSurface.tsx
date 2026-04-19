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
import {
  renderLeaftabFolderDragPreview,
  renderLeaftabFolderEmptyState,
  renderLeaftabFolderItem,
} from './leaftabGridVisuals';

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
  initialWidthPx?: number;
  rootGridColumns?: number;
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

const FOLDER_GRID_COLUMN_GAP_PX = 18;
const FOLDER_GRID_ROW_GAP_PX = 16;
const FOLDER_GRID_MAX_COLUMNS = 4;
const FOLDER_GRID_PREFERRED_COLUMNS = 4;
const FOLDER_OPEN_OVERLAY_DRAG_Z_INDEX = 16030;

function resolveFolderRootColumnCap(rootGridColumns?: number) {
  const resolvedColumns = Number(rootGridColumns);
  if (!Number.isFinite(resolvedColumns)) return FOLDER_GRID_MAX_COLUMNS;
  if (resolvedColumns <= 6) return 4;
  if (resolvedColumns <= 8) return 5;
  return FOLDER_GRID_MAX_COLUMNS;
}

function resolveFolderGridColumns(params: {
  widthPx: number;
  shortcutCount: number;
  compactIconSize: number;
  rootGridColumns?: number;
}) {
  const { widthPx, shortcutCount, compactIconSize, rootGridColumns } = params;
  if (shortcutCount <= 0) return 1;
  const rootCap = resolveFolderRootColumnCap(rootGridColumns);

  // During first paint (before container measurement), keep a stable non-1-column
  // baseline to avoid "vertical first, horizontal later" animation jumps.
  if (widthPx <= 0) {
    return Math.max(
      1,
      Math.min(
        shortcutCount,
        rootCap,
        FOLDER_GRID_MAX_COLUMNS,
        FOLDER_GRID_PREFERRED_COLUMNS,
      ),
    );
  }

  const minCellWidth = Math.max(92, Math.round(compactIconSize + 22));
  const widthDrivenColumns = Math.max(
    1,
    Math.floor((Math.max(0, widthPx) + FOLDER_GRID_COLUMN_GAP_PX) / (minCellWidth + FOLDER_GRID_COLUMN_GAP_PX)),
  );

  const maxColumns = Math.max(1, Math.min(widthDrivenColumns, rootCap, FOLDER_GRID_MAX_COLUMNS, shortcutCount));
  const preferredColumns = Math.min(FOLDER_GRID_PREFERRED_COLUMNS, maxColumns, shortcutCount);

  let bestColumns = 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let columns = 1; columns <= maxColumns; columns += 1) {
    const rows = Math.max(1, Math.ceil(shortcutCount / columns));
    const remainder = shortcutCount % columns;
    const emptySlotsInLastRow = remainder === 0 ? 0 : columns - remainder;
    const preferredDistance = Math.abs(columns - preferredColumns);
    // Keep a stable 4-column visual rhythm when possible, while penalizing ragged last rows.
    const score = preferredDistance * 2 + rows * 0.2 + (emptySlotsInLastRow / columns) * 1.8;

    if (score < bestScore) {
      bestScore = score;
      bestColumns = columns;
    }
  }

  return Math.max(1, Math.min(bestColumns, shortcutCount));
}

export function FolderShortcutSurface({
  folderId,
  shortcuts,
  emptyText,
  initialWidthPx,
  rootGridColumns,
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
  const [columns, setColumns] = useState(() => resolveFolderGridColumns({
    widthPx: Number.isFinite(initialWidthPx) ? Math.max(0, Number(initialWidthPx)) : 0,
    shortcutCount: shortcuts.length,
    compactIconSize,
    rootGridColumns,
  }));
  const [folderDragActive, setFolderDragActive] = useState(false);
  const [hoveredMask, setHoveredMask] = useState(false);
  const shortcutIconRenderContextValue = useMemo(() => ({
    monochromeTone: 'theme-adaptive' as ShortcutMonochromeTone,
    monochromeTileBackdropBlur: false,
  }), []);
  const rowHeight = useMemo(() => {
    // Always reserve the same label lane so title fade-ins don't nudge icon positions.
    const titleAllowance = Math.max(22, Math.round(compactIconSize * 0.32));
    return Math.max(compactIconSize + titleAllowance, compactIconSize + 24);
  }, [compactIconSize]);

  useLayoutEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return;
    }

    const updateColumns = () => {
      const nextColumns = resolveFolderGridColumns({
        widthPx: node.clientWidth,
        shortcutCount: shortcuts.length,
        compactIconSize,
        rootGridColumns,
      });
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
  }, [compactIconSize, rootGridColumns, shortcuts.length]);

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
          overlayZIndex={FOLDER_OPEN_OVERLAY_DRAG_Z_INDEX}
          gridColumns={columns}
          minRows={1}
          rowHeightOverride={rowHeight}
          rowGapPx={FOLDER_GRID_ROW_GAP_PX}
          columnGapPx={FOLDER_GRID_COLUMN_GAP_PX}
          allowLargeFolder={false}
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
          renderShortcutCard={(params) => renderLeaftabFolderItem({
            shortcut: params.shortcut,
            compactIconSize: params.compactIconSize,
            iconCornerRadius: params.iconCornerRadius,
            iconAppearance: params.iconAppearance,
            forceTextWhite: params.forceTextWhite,
            showShortcutTitles: params.compactShowTitle,
            onOpen: params.onOpen,
            onContextMenu: params.onContextMenu,
          })}
          renderDragPreview={(params) => renderLeaftabFolderDragPreview({
            shortcut: params.shortcut,
            compactIconSize: params.compactIconSize,
            iconCornerRadius: params.iconCornerRadius,
            iconAppearance: params.iconAppearance,
            forceTextWhite: params.forceTextWhite,
          })}
        />
      </div>
    </ShortcutIconRenderContext.Provider>
  );
}
