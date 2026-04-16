import {
  RootShortcutGrid as PackageRootShortcutGrid,
} from '@leaftab/workspace-react';
import { createLeaftabRootGridPreset } from '@leaftab/workspace-preset-leaftab';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RootShortcutDropIntent, ShortcutExternalDragSessionSeed } from '@leaftab/workspace-core';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import {
  getCompactShortcutCardMetrics,
} from '@/components/shortcuts/compactFolderLayout';
import { type ShortcutLayoutDensity } from '@/components/shortcuts/shortcutCardVariant';
import { ShortcutIconRenderContext, type ShortcutMonochromeTone } from '@/components/ShortcutIconRenderContext';
import {
  computeLargeFolderPreviewSize,
  renderLeaftabDropPreview,
  renderRootShortcutGridCard,
  renderRootShortcutGridDragPreview,
  renderRootShortcutGridSelectionIndicator,
  renderRootGridCenterPreview,
  resolveLeaftabShadowPreviewGeometry,
} from './leaftabGridVisuals';

export type RootShortcutGridCardRenderParams = {
  shortcut: Shortcut;
  compactShowTitle: boolean;
  compactIconSize: number;
  iconCornerRadius: number;
  iconAppearance: ShortcutIconAppearance;
  compactTitleFontSize: number;
  forceTextWhite: boolean;
  enableLargeFolder: boolean;
  largeFolderPreviewSize?: number;
  folderDropTargetActive?: boolean;
  onPreviewShortcutOpen?: (shortcut: Shortcut) => void;
  selectionDisabled: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
};

export type RootShortcutGridDragPreviewRenderParams = {
  shortcut: Shortcut;
  firefox: boolean;
  compactShowTitle: boolean;
  compactIconSize: number;
  iconCornerRadius: number;
  iconAppearance: ShortcutIconAppearance;
  compactTitleFontSize: number;
  forceTextWhite: boolean;
  enableLargeFolder: boolean;
  largeFolderPreviewSize?: number;
};

export type RootShortcutGridSelectionIndicatorRenderParams = {
  sortId: string;
  selected: boolean;
  compactPreviewSize: number;
};

export type RootShortcutExternalDragSession = ShortcutExternalDragSessionSeed & {
  token: number;
};

export interface RootShortcutGridProps {
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
  compactShowTitle?: boolean;
  layoutDensity?: ShortcutLayoutDensity;
  compactIconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  compactTitleFontSize?: number;
  forceTextWhite?: boolean;
  monochromeTone?: ShortcutMonochromeTone;
  monochromeTileBackdropBlur?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disableReorderAnimation?: boolean;
  selectionMode?: boolean;
  selectedShortcutIndexes?: ReadonlySet<number>;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
  externalDragSession?: RootShortcutExternalDragSession | null;
  onExternalDragSessionConsumed?: (token: number) => void;
  renderShortcutCard?: (params: RootShortcutGridCardRenderParams) => React.ReactNode;
  renderDragPreview?: (params: RootShortcutGridDragPreviewRenderParams) => React.ReactNode;
  renderSelectionIndicator?: (params: RootShortcutGridSelectionIndicatorRenderParams) => React.ReactNode;
}


export const RootShortcutGrid = React.memo(function RootShortcutGrid({
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
  compactShowTitle = true,
  layoutDensity: _layoutDensity = 'regular',
  compactIconSize = 72,
  iconCornerRadius = 22,
  iconAppearance = 'colorful',
  compactTitleFontSize = 12,
  forceTextWhite = false,
  monochromeTone = 'theme-adaptive',
  monochromeTileBackdropBlur = false,
  onDragStart,
  onDragEnd,
  disableReorderAnimation = false,
  selectionMode = false,
  selectedShortcutIndexes,
  onToggleShortcutSelection,
  externalDragSession,
  onExternalDragSessionConsumed,
  renderShortcutCard = renderRootShortcutGridCard,
  renderDragPreview = renderRootShortcutGridDragPreview,
  renderSelectionIndicator = renderRootShortcutGridSelectionIndicator,
}: RootShortcutGridProps) {
  const firefox = isFirefoxBuildTarget();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [gridWidthPx, setGridWidthPx] = useState<number | null>(null);

  const shortcutIconRenderContextValue = useMemo(() => ({
    monochromeTone,
    monochromeTileBackdropBlur,
  }), [monochromeTileBackdropBlur, monochromeTone]);

  const fallbackCellSize = useMemo(
    () => Math.max(compactIconSize / 0.8, compactIconSize + 16),
    [compactIconSize],
  );
  const rowHeight = useMemo(() => {
    if (!gridWidthPx || gridColumns <= 0) {
      return fallbackCellSize;
    }

    return gridWidthPx / Math.max(gridColumns, 1);
  }, [fallbackCellSize, gridColumns, gridWidthPx]);
  const columnGap = 0;
  const rowGap = 0;
  const resolvedTitleBlockHeight = useMemo(
    () => Math.max(12, Math.round(rowHeight * 0.2)),
    [rowHeight],
  );
  const resolvedInteractionPreviewSize = useMemo(
    () => Math.max(24, Math.round(rowHeight - resolvedTitleBlockHeight)),
    [resolvedTitleBlockHeight, rowHeight],
  );
  const resolvedVisualTitleFontSize = useMemo(
    () => Math.max(10, Math.min(compactTitleFontSize, Math.round(resolvedTitleBlockHeight * 0.58))),
    [compactTitleFontSize, resolvedTitleBlockHeight],
  );
  const largeFolderEnabled = gridColumns >= 2;

  useLayoutEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return;

    const updateWidth = () => {
      const nextWidth = Math.round(node.clientWidth);
      setGridWidthPx((current) => (current === nextWidth ? current : nextWidth));
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });
    resizeObserver.observe(node);
    window.addEventListener('resize', updateWidth, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const largeFolderPreviewSize = useMemo(() => computeLargeFolderPreviewSize({
    compactIconSize: resolvedInteractionPreviewSize,
    columnGap,
    rowGap,
    gridColumns,
    gridWidthPx,
    largeFolderEnabled,
  }), [columnGap, resolvedInteractionPreviewSize, gridColumns, gridWidthPx, largeFolderEnabled, rowGap]);

  const rootGridPreset = useMemo(() => createLeaftabRootGridPreset({
    getRootRect: () => wrapperRef.current?.getBoundingClientRect() ?? null,
    gridWidthPx: gridWidthPx ?? 0,
    gridColumns,
    rowHeight,
    rowGap,
    columnGap,
    compactIconSize: resolvedInteractionPreviewSize,
    titleBlockHeight: resolvedTitleBlockHeight,
    iconCornerRadius,
    largeFolderPreviewSize,
    largeFolderEnabled,
  }), [
    columnGap,
    gridColumns,
    gridWidthPx,
    largeFolderEnabled,
    largeFolderPreviewSize,
    resolvedInteractionPreviewSize,
    resolvedTitleBlockHeight,
    rowGap,
    rowHeight,
    iconCornerRadius,
  ]);

  return (
    <ShortcutIconRenderContext.Provider value={shortcutIconRenderContextValue}>
      <div ref={wrapperRef} className="w-full">
        <PackageRootShortcutGrid
          containerHeight={containerHeight}
          bottomInset={bottomInset}
          shortcuts={shortcuts}
          gridColumns={gridColumns}
          minRows={minRows}
          rowHeight={rowHeight}
          rowGap={rowGap}
          columnGap={columnGap}
          resolveItemLayout={rootGridPreset.resolveItemLayout}
          onShortcutOpen={onShortcutOpen}
          onShortcutContextMenu={onShortcutContextMenu}
          onShortcutReorder={onShortcutReorder}
          onShortcutDropIntent={onShortcutDropIntent}
          onGridContextMenu={onGridContextMenu}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          disableReorderAnimation={disableReorderAnimation}
          selectionMode={selectionMode}
          selectedShortcutIndexes={selectedShortcutIndexes}
          onToggleShortcutSelection={onToggleShortcutSelection}
          externalDragSession={externalDragSession}
          onExternalDragSessionConsumed={onExternalDragSessionConsumed}
          isFirefox={firefox}
          resolveCompactTargetRegions={rootGridPreset.resolveCompactTargetRegions}
          resolveDropTargetRects={rootGridPreset.resolveDropTargetRects}
          renderItem={(params) => {
            const compactMetrics = getCompactShortcutCardMetrics({
              shortcut: params.shortcut,
              iconSize: compactIconSize,
              allowLargeFolder: largeFolderEnabled,
              largeFolderPreviewSize,
            });

            return (
              <div className="relative z-10">
                {renderShortcutCard({
                  shortcut: params.shortcut,
                  compactShowTitle,
                  compactIconSize,
                  iconCornerRadius,
                  iconAppearance,
                  compactTitleFontSize: resolvedVisualTitleFontSize,
                  forceTextWhite,
                  enableLargeFolder: largeFolderEnabled,
                  largeFolderPreviewSize,
                  folderDropTargetActive: params.centerPreviewActive && params.shortcut.kind === 'folder',
                  onPreviewShortcutOpen: selectionMode ? undefined : onShortcutOpen,
                  selectionDisabled: params.selectionDisabled,
                  onOpen: params.onOpen,
                  onContextMenu: params.onContextMenu,
                })}
                {selectionMode && params.shortcut.kind !== 'folder' ? (
                  <div
                    className="pointer-events-none absolute inset-0 z-20 rounded-xl"
                    aria-hidden="true"
                  >
                    {renderSelectionIndicator({
                      sortId: params.shortcut.id,
                      selected: params.selected,
                      compactPreviewSize: compactMetrics.previewSize,
                    })}
                  </div>
                ) : null}
              </div>
            );
          }}
          renderCenterPreview={(params) => {
            if (params.shortcut.kind === 'folder') return null;

            return renderRootGridCenterPreview({
              shortcut: params.shortcut,
              compactIconSize,
              iconCornerRadius,
              largeFolderEnabled,
              largeFolderPreviewSize,
            });
          }}
          renderDropPreview={(params) => {
            const shadowGeometry = resolveLeaftabShadowPreviewGeometry({
              shortcut: params.shortcut,
              iconSize: compactIconSize,
              iconCornerRadius,
              allowLargeFolder: largeFolderEnabled,
              largeFolderPreviewSize,
            });

            return renderLeaftabDropPreview({
              ...params,
              ...shadowGeometry,
              shadowOffsetX: (params.width - shadowGeometry.shadowWidth) / 2,
              shadowOffsetY: (params.height - shadowGeometry.shadowHeight) / 2,
              testId: 'shortcut-drop-preview',
            });
          }}
          renderDragPreview={(params) => renderDragPreview({
            shortcut: params.shortcut,
            firefox,
            compactShowTitle,
            compactIconSize,
            iconCornerRadius,
            iconAppearance,
            compactTitleFontSize: resolvedVisualTitleFontSize,
            forceTextWhite,
            enableLargeFolder: largeFolderEnabled,
            largeFolderPreviewSize,
          })}
        />
      </div>
    </ShortcutIconRenderContext.Provider>
  );
});
