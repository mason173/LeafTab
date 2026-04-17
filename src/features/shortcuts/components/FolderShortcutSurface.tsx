import {
  FolderShortcutSurface as PackageFolderShortcutSurface,
  type FolderExtractDragStartPayload,
  type FolderShortcutDropIntent,
} from '@leaftab/workspace-react';
import { createLeaftabFolderSurfacePreset } from '@leaftab/workspace-preset-leaftab';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import { ShortcutIconRenderContext, type ShortcutMonochromeTone } from '@/components/ShortcutIconRenderContext';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import {
  renderLeaftabFolderDragPreview,
  renderLeaftabFolderDropPreview,
  renderLeaftabFolderEmptyState,
  renderLeaftabFolderItem,
  resolveLeaftabShadowPreviewGeometry,
} from './leaftabGridVisuals';

export type { FolderExtractDragStartPayload } from '@leaftab/workspace-react';

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
  onExtractDragStart,
  onDragActiveChange,
}: FolderShortcutSurfaceProps) {
  const firefox = isFirefoxBuildTarget();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);
  const [gridWidthPx, setGridWidthPx] = useState<number | null>(null);
  const shortcutIconRenderContextValue = useMemo(() => ({
    monochromeTone: 'theme-adaptive' as ShortcutMonochromeTone,
    monochromeTileBackdropBlur: false,
  }), []);

  useLayoutEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return;

    const updateColumns = () => {
      const nextColumns = node.clientWidth >= 640 ? 4 : 3;
      setColumns((current) => (current === nextColumns ? current : nextColumns));
      const nextWidth = Math.round(node.clientWidth);
      setGridWidthPx((current) => (current === nextWidth ? current : nextWidth));
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

  const fallbackCellSize = useMemo(
    () => Math.max(compactIconSize / 0.8, compactIconSize + 16),
    [compactIconSize],
  );
  const cellSize = useMemo(() => {
    if (!gridWidthPx || columns <= 0) {
      return fallbackCellSize;
    }

    return gridWidthPx / Math.max(columns, 1);
  }, [columns, fallbackCellSize, gridWidthPx]);
  const resolvedTitleBlockHeight = useMemo(
    () => Math.max(12, Math.round(cellSize * 0.2)),
    [cellSize],
  );
  const resolvedInteractionPreviewSize = useMemo(
    () => Math.max(24, Math.round(cellSize - resolvedTitleBlockHeight)),
    [cellSize, resolvedTitleBlockHeight],
  );

  const folderSurfacePreset = useMemo(() => createLeaftabFolderSurfacePreset({
    compactIconSize: resolvedInteractionPreviewSize,
    titleBlockHeight: resolvedTitleBlockHeight,
    iconCornerRadius,
  }), [iconCornerRadius, resolvedInteractionPreviewSize, resolvedTitleBlockHeight]);

  return (
    <ShortcutIconRenderContext.Provider value={shortcutIconRenderContextValue}>
      <div ref={wrapperRef}>
        <PackageFolderShortcutSurface
          folderId={folderId}
          shortcuts={shortcuts}
          emptyText={emptyText}
          columns={columns}
          cellSize={cellSize}
          columnGap={0}
          rowGap={0}
          maskBoundaryRef={maskBoundaryRef}
          isFirefox={firefox}
          resolveItemLayout={folderSurfacePreset.resolveItemLayout}
          renderEmptyState={() => renderLeaftabFolderEmptyState(emptyText)}
          renderDropPreview={(params) => {
            const shadowGeometry = resolveLeaftabShadowPreviewGeometry({
              shortcut: params.shortcut,
              iconSize: compactIconSize,
              iconCornerRadius,
              allowLargeFolder: true,
            });

            return renderLeaftabFolderDropPreview({
              ...params,
              ...shadowGeometry,
              shadowOffsetX: (params.width - shadowGeometry.shadowWidth) / 2,
              shadowOffsetY: (params.height - shadowGeometry.shadowHeight) / 2,
            });
          }}
          renderItem={(params) => renderLeaftabFolderItem({
            shortcut: params.shortcut,
            compactIconSize,
            iconCornerRadius,
            iconAppearance,
            forceTextWhite,
            showShortcutTitles,
            onOpen: params.onOpen,
            onContextMenu: params.onContextMenu,
          })}
          renderDragPreview={(params) => renderLeaftabFolderDragPreview({
            shortcut: params.shortcut,
            compactIconSize,
            iconCornerRadius,
            iconAppearance,
            forceTextWhite,
          })}
          onShortcutOpen={onShortcutOpen}
          onShortcutContextMenu={onShortcutContextMenu}
          onShortcutDropIntent={onShortcutDropIntent}
          onExtractDragStart={onExtractDragStart}
          onDragActiveChange={onDragActiveChange}
        />
      </div>
    </ShortcutIconRenderContext.Provider>
  );
}
