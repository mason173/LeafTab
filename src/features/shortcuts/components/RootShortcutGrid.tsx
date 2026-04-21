import {
  RootShortcutGrid as PackageRootShortcutGrid,
  type GridInteractionProfileLike,
  type RootShortcutGridHeatZoneInspector,
  type RootShortcutDropIntent,
  type ShortcutExternalDragSessionSeed,
} from '@leaftab/workspace-react';
import { createLeaftabRootGridPreset } from '@leaftab/workspace-preset-leaftab';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import { RenderProfileBoundary } from '@/dev/renderProfiler';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import {
  getCompactShortcutCardMetrics,
} from '@/components/shortcuts/compactFolderLayout';
import { type ShortcutLayoutDensity } from '@/components/shortcuts/shortcutCardVariant';
import { ShortcutIconRenderContext, type ShortcutMonochromeTone } from '@/components/ShortcutIconRenderContext';
import {
  computeLargeFolderPreviewSize,
  renderRootShortcutGridCard,
  renderRootShortcutGridDragPreview,
  renderRootShortcutGridSelectionIndicator,
} from './leaftabGridVisuals';

const HEAT_ZONE_CORE_INSET = 24;
const HEAT_ZONE_LARGE_FOLDER_CORE_INSET = 12;
function HeatZoneInspectorPanel({
  inspector,
}: {
  inspector: RootShortcutGridHeatZoneInspector | null;
}) {
  const zone = inspector?.zone ?? null;
  const aimX = inspector?.aimX ?? 50;
  const aimY = inspector?.aimY ?? 50;
  const largeTarget = inspector?.largeTarget ?? false;
  const coreInset = largeTarget ? HEAT_ZONE_LARGE_FOLDER_CORE_INSET : HEAT_ZONE_CORE_INSET;
  const targetLabel = inspector?.targetKind === 'empty'
    ? '空位'
    : inspector?.targetTitle ?? '未命中';
  const targetKindLabel = inspector?.targetKind === 'folder'
    ? '文件夹'
    : inspector?.targetKind === 'shortcut'
      ? '图标'
      : '网格';

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-30">
      <div className="w-[112px] rounded-[18px] border border-black/10 bg-[rgba(248,250,252,0.92)] p-2 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-md">
        <div className="mb-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {targetKindLabel}
          </div>
          <div className="truncate text-[11px] font-semibold text-slate-800">
            {targetLabel}
          </div>
        </div>
        <div
          className={[
            'relative h-[84px] w-[84px] overflow-hidden rounded-[18px] border border-black/10 bg-[rgba(248,250,252,0.9)] shadow-[0_8px_20px_rgba(15,23,42,0.08)]',
            largeTarget ? 'ring-1 ring-emerald-400/20' : '',
          ].filter(Boolean).join(' ')}
        >
          <div className="absolute inset-0 bg-[rgba(239,68,68,0.08)]" />
          <div
            className="absolute border border-emerald-500/45 bg-emerald-400/12"
            style={{
              left: `${coreInset}%`,
              top: `${coreInset}%`,
              right: `${coreInset}%`,
              bottom: `${coreInset}%`,
              borderRadius: largeTarget ? '16px' : '14px',
            }}
          />
          {[
            { key: 'T', className: 'left-1/2 top-2 -translate-x-1/2', active: zone === 'T' },
            { key: 'L', className: 'left-2 top-1/2 -translate-y-1/2', active: zone === 'L' },
            { key: 'R', className: 'right-2 top-1/2 -translate-y-1/2', active: zone === 'R' },
            { key: 'B', className: 'bottom-2 left-1/2 -translate-x-1/2', active: zone === 'B' },
          ].map((label) => (
            <span
              key={label.key}
              className={[
                'absolute text-[11px] font-semibold tracking-[0.08em] text-slate-500 transition-colors',
                label.className,
                label.active ? 'text-rose-500' : '',
              ].filter(Boolean).join(' ')}
            >
              {label.key}
            </span>
          ))}
          <div
            className={[
              'absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-slate-900 shadow-[0_0_0_4px_rgba(255,255,255,0.32)]',
              zone === 'core' ? 'bg-emerald-500' : '',
            ].filter(Boolean).join(' ')}
            style={{
              left: `${aimX}%`,
              top: `${aimY}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

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
  dropTargetActive?: boolean;
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
  surfaceInstanceKey?: string;
  containerHeight: number;
  bottomInset?: number;
  shortcuts: Shortcut[];
  hiddenShortcutId?: string | null;
  overlayZIndex?: number;
  gridColumns: number;
  minRows: number;
  rowHeightOverride?: number;
  rowGapPx?: number;
  columnGapPx?: number;
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
  interactionProfile?: GridInteractionProfileLike;
  extractBoundaryRef?: React.RefObject<HTMLElement | null>;
  onExtractDragStart?: (payload: ShortcutExternalDragSessionSeed) => void;
  onBoundaryHoverChange?: (hovered: boolean) => void;
  disableReorderAnimation?: boolean;
  selectionMode?: boolean;
  selectedShortcutIndexes?: ReadonlySet<number>;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
  externalDragSession?: RootShortcutExternalDragSession | null;
  onExternalDragSessionConsumed?: (token: number) => void;
  renderShortcutCard?: (params: RootShortcutGridCardRenderParams) => React.ReactNode;
  renderDragPreview?: (params: RootShortcutGridDragPreviewRenderParams) => React.ReactNode;
  renderSelectionIndicator?: (params: RootShortcutGridSelectionIndicatorRenderParams) => React.ReactNode;
  heatZoneInspectorEnabled?: boolean;
  allowLargeFolder?: boolean;
}


export const RootShortcutGrid = React.memo(function RootShortcutGrid({
  surfaceInstanceKey: _surfaceInstanceKey,
  containerHeight,
  bottomInset = 0,
  shortcuts,
  hiddenShortcutId = null,
  overlayZIndex,
  gridColumns,
  minRows,
  rowHeightOverride,
  rowGapPx = 0,
  columnGapPx = 0,
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
  interactionProfile,
  extractBoundaryRef,
  onExtractDragStart,
  onBoundaryHoverChange,
  disableReorderAnimation = false,
  selectionMode = false,
  selectedShortcutIndexes,
  onToggleShortcutSelection,
  externalDragSession,
  onExternalDragSessionConsumed,
  renderShortcutCard = renderRootShortcutGridCard,
  renderDragPreview = renderRootShortcutGridDragPreview,
  renderSelectionIndicator = renderRootShortcutGridSelectionIndicator,
  heatZoneInspectorEnabled = false,
  allowLargeFolder = true,
}: RootShortcutGridProps) {
  const firefox = isFirefoxBuildTarget();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [gridWidthPx, setGridWidthPx] = useState<number | null>(null);
  const [heatZoneInspector, setHeatZoneInspector] = useState<RootShortcutGridHeatZoneInspector | null>(null);

  useEffect(() => {
    if (!heatZoneInspectorEnabled) {
      setHeatZoneInspector(null);
    }
  }, [heatZoneInspectorEnabled]);

  const shortcutIconRenderContextValue = useMemo(() => ({
    monochromeTone,
    monochromeTileBackdropBlur,
  }), [monochromeTileBackdropBlur, monochromeTone]);

  const fallbackCellSize = useMemo(
    () => Math.max(compactIconSize / 0.8, compactIconSize + 16),
    [compactIconSize],
  );
  const rowHeight = useMemo(() => {
    if (Number.isFinite(rowHeightOverride) && Number(rowHeightOverride) > 0) {
      return Math.max(1, Math.round(Number(rowHeightOverride)));
    }
    if (!gridWidthPx || gridColumns <= 0) {
      return fallbackCellSize;
    }

    return gridWidthPx / Math.max(gridColumns, 1);
  }, [fallbackCellSize, gridColumns, gridWidthPx, rowHeightOverride]);
  const columnGap = Math.max(0, Math.round(columnGapPx));
  const rowGap = Math.max(0, Math.round(rowGapPx));
  const resolvedTitleBlockHeight = useMemo(
    () => Math.max(12, Math.round(rowHeight * 0.2)),
    [rowHeight],
  );
  const resolvedVisualTitleFontSize = useMemo(
    () => Math.max(10, Math.min(compactTitleFontSize, Math.round(resolvedTitleBlockHeight * 0.58))),
    [compactTitleFontSize, resolvedTitleBlockHeight],
  );
  const largeFolderEnabled = allowLargeFolder && gridColumns >= 2;

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

  const rootGridPreset = useMemo(() => createLeaftabRootGridPreset({
    getRootRect: () => wrapperRef.current?.getBoundingClientRect() ?? null,
    gridWidthPx: gridWidthPx ?? 0,
    gridColumns,
    rowHeight,
    rowGap,
    columnGap,
    compactIconSize,
    iconCornerRadius,
    largeFolderPreviewSize,
    largeFolderEnabled,
  }), [
    columnGap,
    compactIconSize,
    gridColumns,
    gridWidthPx,
    largeFolderEnabled,
    largeFolderPreviewSize,
    rowGap,
    rowHeight,
    iconCornerRadius,
  ]);
  return (
    <RenderProfileBoundary id="RootShortcutGrid">
      <ShortcutIconRenderContext.Provider value={shortcutIconRenderContextValue}>
        <div ref={wrapperRef} className="relative w-full">
          <PackageRootShortcutGrid
            containerHeight={containerHeight}
            bottomInset={bottomInset}
            shortcuts={shortcuts}
            overlayZIndex={overlayZIndex}
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
            interactionProfile={interactionProfile}
            onHeatZoneInspectorChange={heatZoneInspectorEnabled ? setHeatZoneInspector : undefined}
            extractBoundaryRef={extractBoundaryRef}
            onExtractDragStart={onExtractDragStart}
            onBoundaryHoverChange={onBoundaryHoverChange}
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
              const hiddenFromBackgroundLayer = hiddenShortcutId === params.shortcut.id;

              if (hiddenFromBackgroundLayer) {
                return (
                  <div
                    className="relative z-10"
                    style={{
                      width: compactMetrics.width,
                      height: compactMetrics.height,
                      visibility: 'hidden',
                      pointerEvents: 'none',
                    }}
                    aria-hidden="true"
                  >
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
                      dropTargetActive: params.centerPreviewActive,
                      onPreviewShortcutOpen: selectionMode ? undefined : onShortcutOpen,
                      selectionDisabled: params.selectionDisabled,
                      onOpen: params.onOpen,
                      onContextMenu: params.onContextMenu,
                    })}
                  </div>
                );
              }

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
                    dropTargetActive: params.centerPreviewActive,
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
            renderCenterPreview={() => null}
            renderDropPreview={() => null}
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
          {heatZoneInspectorEnabled ? <HeatZoneInspectorPanel inspector={heatZoneInspector} /> : null}
        </div>
      </ShortcutIconRenderContext.Provider>
    </RenderProfileBoundary>
  );
});
