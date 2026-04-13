import {
  RootShortcutGrid as PackageRootShortcutGrid,
  type RootShortcutGridProps as PackageRootShortcutGridProps,
} from '@leaftab/grid-react';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import {
  COMPACT_SHORTCUT_GRID_COLUMN_GAP_PX,
  getCompactShortcutCardMetrics,
} from '@/components/shortcuts/compactFolderLayout';
import {
  DEFAULT_SHORTCUT_CARD_VARIANT,
  type ShortcutCardVariant,
  type ShortcutLayoutDensity,
} from '@/components/shortcuts/shortcutCardVariant';
import { ShortcutIconRenderContext, type ShortcutMonochromeTone } from '@/components/ShortcutIconRenderContext';
import {
  getCompactTargetCellRect as getCompactTargetCellRegionRect,
  resolveCompactTargetRegions as resolveCompactTargetRegionSet,
} from '@/features/shortcuts/drag/compactRootDrag';
import type { RootShortcutDropIntent, ShortcutExternalDragSessionSeed } from '@/features/shortcuts/drag/types';
import {
  computeLargeFolderPreviewSize,
  renderDefaultShortcutGridCard,
  renderDefaultShortcutGridDragPreview,
  renderDefaultShortcutGridSelectionIndicator,
  renderRootGridCenterPreview,
  resolveLeaftabRootItemLayout,
} from './leaftabGridVisuals';

export type RootShortcutGridCardRenderParams = {
  shortcut: Shortcut;
  variant: ShortcutCardVariant;
  compactShowTitle: boolean;
  compactIconSize: number;
  iconCornerRadius: number;
  iconAppearance: ShortcutIconAppearance;
  compactTitleFontSize: number;
  defaultIconSize: number;
  defaultTitleFontSize: number;
  defaultUrlFontSize: number;
  defaultVerticalPadding: number;
  forceTextWhite: boolean;
  enableLargeFolder: boolean;
  largeFolderPreviewSize?: number;
  onPreviewShortcutOpen?: (shortcut: Shortcut) => void;
  selectionDisabled: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
};

export type RootShortcutGridDragPreviewRenderParams = {
  shortcut: Shortcut;
  variant: ShortcutCardVariant;
  firefox: boolean;
  compactShowTitle: boolean;
  compactIconSize: number;
  iconCornerRadius: number;
  iconAppearance: ShortcutIconAppearance;
  compactTitleFontSize: number;
  defaultIconSize: number;
  defaultTitleFontSize: number;
  defaultUrlFontSize: number;
  defaultVerticalPadding: number;
  forceTextWhite: boolean;
  enableLargeFolder: boolean;
  largeFolderPreviewSize?: number;
};

export type RootShortcutGridSelectionIndicatorRenderParams = {
  sortId: string;
  selected: boolean;
  cardVariant: ShortcutCardVariant;
  compactPreviewSize: number;
  defaultIconSize: number;
  defaultVerticalPadding: number;
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
  cardVariant?: ShortcutCardVariant;
  compactShowTitle?: boolean;
  layoutDensity?: ShortcutLayoutDensity;
  compactIconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  compactTitleFontSize?: number;
  defaultIconSize?: number;
  defaultTitleFontSize?: number;
  defaultUrlFontSize?: number;
  defaultVerticalPadding?: number;
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
  cardVariant = DEFAULT_SHORTCUT_CARD_VARIANT,
  compactShowTitle = true,
  layoutDensity = 'regular',
  compactIconSize = 72,
  iconCornerRadius = 22,
  iconAppearance = 'colorful',
  compactTitleFontSize = 12,
  defaultIconSize = 36,
  defaultTitleFontSize = 14,
  defaultUrlFontSize = 10,
  defaultVerticalPadding = 8,
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
  renderShortcutCard = renderDefaultShortcutGridCard,
  renderDragPreview = renderDefaultShortcutGridDragPreview,
  renderSelectionIndicator = renderDefaultShortcutGridSelectionIndicator,
}: RootShortcutGridProps) {
  const firefox = isFirefoxBuildTarget();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [gridWidthPx, setGridWidthPx] = useState<number | null>(null);

  const shortcutIconRenderContextValue = useMemo(() => ({
    monochromeTone,
    monochromeTileBackdropBlur,
  }), [monochromeTileBackdropBlur, monochromeTone]);

  const compactLayout = cardVariant === 'compact';
  const columnGap = compactLayout ? COMPACT_SHORTCUT_GRID_COLUMN_GAP_PX : 8;
  const rowGap = cardVariant === 'compact'
    ? (layoutDensity === 'compact' ? 16 : layoutDensity === 'large' ? 24 : 20)
    : 8;
  const rowHeight = cardVariant === 'compact'
    ? (compactIconSize + 24)
    : (defaultIconSize + defaultVerticalPadding * 2);
  const largeFolderEnabled = compactLayout && gridColumns >= 2;

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
    compactIconSize,
    columnGap,
    rowGap,
    gridColumns,
    gridWidthPx,
    largeFolderEnabled,
  }), [columnGap, compactIconSize, gridColumns, gridWidthPx, largeFolderEnabled, rowGap]);

  const resolveItemLayout = useCallback<PackageRootShortcutGridProps['resolveItemLayout']>((shortcut) => {
    return resolveLeaftabRootItemLayout({
      shortcut,
      compactLayout,
      compactIconSize,
      largeFolderEnabled,
      largeFolderPreviewSize,
      iconCornerRadius,
      rowHeight,
    });
  }, [
    compactIconSize,
    compactLayout,
    iconCornerRadius,
    largeFolderEnabled,
    largeFolderPreviewSize,
    rowHeight,
  ]);

  const resolveCompactTargetRegions = useCallback<NonNullable<PackageRootShortcutGridProps['resolveCompactTargetRegions']>>((params) => {
    const rootRect = wrapperRef.current?.getBoundingClientRect();
    if (!rootRect || !gridWidthPx) {
      return {
        targetCellRegion: params.rect,
        targetIconRegion: params.rect,
        targetIconHitRegion: params.rect,
      };
    }

    const gridColumnWidth = (gridWidthPx - columnGap * Math.max(0, gridColumns - 1)) / Math.max(gridColumns, 1);
    const targetCellRegion = getCompactTargetCellRegionRect({
      columnStart: params.columnStart,
      rowStart: params.rowStart,
      columnSpan: params.columnSpan,
      rowSpan: params.rowSpan,
      rootRect,
      gridColumnWidth,
      columnGap,
      rowHeight,
      rowGap,
    });
    return resolveCompactTargetRegionSet({
      rect: targetCellRegion,
      shortcut: params.shortcut,
      compactIconSize,
      largeFolderEnabled,
      largeFolderPreviewSize,
    });
  }, [
    columnGap,
    compactIconSize,
    gridColumns,
    gridWidthPx,
    largeFolderEnabled,
    largeFolderPreviewSize,
    rowGap,
    rowHeight,
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
          resolveItemLayout={resolveItemLayout}
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
          resolveCompactTargetRegions={compactLayout ? resolveCompactTargetRegions : undefined}
          resolveDropTargetRects={compactLayout && gridWidthPx
            ? (params) => {
                const targetRegions = resolveCompactTargetRegions(params);
                return {
                  overRect: targetRegions.targetCellRegion,
                  overCenterRect: targetRegions.targetIconRegion,
                };
              }
            : undefined}
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
                  variant: cardVariant,
                  compactShowTitle,
                  compactIconSize,
                  iconCornerRadius,
                  iconAppearance,
                  compactTitleFontSize,
                  defaultIconSize,
                  defaultTitleFontSize,
                  defaultUrlFontSize,
                  defaultVerticalPadding,
                  forceTextWhite,
                  enableLargeFolder: largeFolderEnabled,
                  largeFolderPreviewSize,
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
                      cardVariant,
                      compactPreviewSize: compactMetrics.previewSize,
                      defaultIconSize,
                      defaultVerticalPadding,
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
              cardVariant,
              compactIconSize,
              iconCornerRadius,
              largeFolderEnabled,
              largeFolderPreviewSize,
            });
          }}
          renderDropPreview={(params) => (
            <div
              data-testid="shortcut-drop-preview"
              aria-hidden="true"
              className="pointer-events-none absolute z-0 bg-white/30"
              style={{
                left: params.left,
                top: params.top,
                width: params.width,
                height: params.height,
                borderRadius: params.borderRadius,
              }}
            />
          )}
          renderDragPreview={(params) => renderDragPreview({
            shortcut: params.shortcut,
            variant: cardVariant,
            firefox,
            compactShowTitle,
            compactIconSize,
            iconCornerRadius,
            iconAppearance,
            compactTitleFontSize,
            defaultIconSize,
            defaultTitleFontSize,
            defaultUrlFontSize,
            defaultVerticalPadding,
            forceTextWhite,
            enableLargeFolder: largeFolderEnabled,
            largeFolderPreviewSize,
          })}
        />
      </div>
    </ShortcutIconRenderContext.Provider>
  );
});
