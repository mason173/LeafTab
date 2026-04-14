import React from 'react';
import { RiCheckFill } from '@/icons/ri-compat';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import {
  COMPACT_SHORTCUT_TITLE_BLOCK_HEIGHT_PX,
  getCompactShortcutCardMetrics,
} from '@/components/shortcuts/compactFolderLayout';
import { ShortcutCardCompact } from '@/components/shortcuts/ShortcutCardCompact';
import { getLargeFolderBorderRadius, getSmallFolderBorderRadius } from '@/components/shortcuts/ShortcutFolderPreview';
import { ShortcutCardRenderer } from '@/components/shortcuts/ShortcutCardRenderer';
import { getShortcutIconBorderRadius } from '@/utils/shortcutIconSettings';

const SELECTION_INDICATOR_SIZE_PX = 16;
const SELECTION_INDICATOR_OFFSET_PX = -4;
const MERGE_PREVIEW_COMPACT_TINT = 'rgba(232, 236, 240, 0.3)';

type RootShortcutGridCardRenderParamsShape = {
  shortcut: Shortcut;
  compactShowTitle: boolean;
  compactIconSize: number;
  iconCornerRadius: number;
  iconAppearance: ShortcutIconAppearance;
  compactTitleFontSize: number;
  forceTextWhite: boolean;
  enableLargeFolder: boolean;
  largeFolderPreviewSize?: number;
  onPreviewShortcutOpen?: (shortcut: Shortcut) => void;
  selectionDisabled: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
};

type RootShortcutGridDragPreviewRenderParamsShape = {
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

type RootShortcutGridSelectionIndicatorRenderParamsShape = {
  sortId: string;
  selected: boolean;
  compactPreviewSize: number;
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
  firefox,
  compactShowTitle,
  compactIconSize,
  iconCornerRadius,
  compactTitleFontSize,
  forceTextWhite,
}: RootShortcutGridDragPreviewRenderParamsShape) {
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

function ShortcutSelectionIndicator({
  compactPreviewSize,
  selected,
  sortId,
}: RootShortcutGridSelectionIndicatorRenderParamsShape) {
  return (
    <span
      className="pointer-events-none absolute"
      style={{
        width: compactPreviewSize,
        height: compactPreviewSize,
        left: '50%',
        top: 0,
        transform: 'translateX(-50%)',
      }}
      aria-hidden="true"
    >
      <span
        data-testid={`shortcut-selection-indicator-${sortId}`}
        data-selected={selected}
        className={`absolute flex items-center justify-center rounded-full border shadow-[0_3px_10px_rgba(0,0,0,0.16)] ${
          selected
            ? 'border-white/85 bg-primary text-primary-foreground'
            : 'border-white/35 bg-black/35 text-transparent backdrop-blur-[6px]'
        }`}
        style={{
          right: SELECTION_INDICATOR_OFFSET_PX,
          top: SELECTION_INDICATOR_OFFSET_PX,
          width: SELECTION_INDICATOR_SIZE_PX,
          height: SELECTION_INDICATOR_SIZE_PX,
        }}
      >
        {selected ? <RiCheckFill className="size-[10px]" /> : null}
      </span>
    </span>
  );
}

function MergePreviewHighlight({
  compactPreviewWidth,
  compactPreviewHeight,
  iconCornerRadius,
  compactPreviewBorderRadius,
}: {
  compactPreviewWidth: number;
  compactPreviewHeight: number;
  iconCornerRadius: number;
  compactPreviewBorderRadius?: string;
}) {
  const maskId = React.useId();
  const borderRadius = compactPreviewBorderRadius || getShortcutIconBorderRadius(iconCornerRadius);
  const haloInset = 6;
  const radiusExpansionPx = 4;
  const outerWidth = compactPreviewWidth + haloInset * 2;
  const outerHeight = compactPreviewHeight + haloInset * 2;
  const outerRadius = `calc(${borderRadius} + ${radiusExpansionPx}px)`;
  const innerRadius = borderRadius;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-0 z-0 -translate-x-1/2 overflow-visible"
      style={{
        width: outerWidth,
        height: outerHeight,
        top: -haloInset,
      }}
    >
      <svg
        width={outerWidth}
        height={outerHeight}
        viewBox={`0 0 ${outerWidth} ${outerHeight}`}
        className="block overflow-visible"
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width={outerWidth} height={outerHeight} rx={outerRadius} ry={outerRadius} fill="white" />
            <rect x={haloInset} y={haloInset} width={compactPreviewWidth} height={compactPreviewHeight} rx={innerRadius} ry={innerRadius} fill="black" />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width={outerWidth}
          height={outerHeight}
          rx={outerRadius}
          ry={outerRadius}
          fill={MERGE_PREVIEW_COMPACT_TINT}
          mask={`url(#${maskId})`}
        />
      </svg>
    </div>
  );
}

export function renderRootShortcutGridCard(params: RootShortcutGridCardRenderParamsShape) {
  return (
    <ShortcutCardRenderer
      compactShowTitle={params.compactShowTitle}
      compactIconSize={params.compactIconSize}
      iconCornerRadius={params.iconCornerRadius}
      iconAppearance={params.iconAppearance}
      compactTitleFontSize={params.compactTitleFontSize}
      forceTextWhite={params.forceTextWhite}
      enableLargeFolder={params.enableLargeFolder}
      largeFolderPreviewSize={params.largeFolderPreviewSize}
      onPreviewShortcutOpen={params.onPreviewShortcutOpen}
      selectionDisabled={params.selectionDisabled}
      shortcut={params.shortcut}
      onOpen={params.onOpen}
      onContextMenu={params.onContextMenu}
    />
  );
}

export function renderRootShortcutGridDragPreview(params: RootShortcutGridDragPreviewRenderParamsShape) {
  if (params.firefox) {
    return <LightweightDragPreview {...params} />;
  }

  return (
    <ShortcutCardRenderer
      compactShowTitle={params.compactShowTitle}
      compactIconSize={params.compactIconSize}
      iconCornerRadius={params.iconCornerRadius}
      iconAppearance={params.iconAppearance}
      compactTitleFontSize={params.compactTitleFontSize}
      forceTextWhite={params.forceTextWhite}
      enableLargeFolder={params.enableLargeFolder}
      largeFolderPreviewSize={params.largeFolderPreviewSize}
      shortcut={params.shortcut}
      onOpen={() => {}}
      onContextMenu={() => {}}
    />
  );
}

export function renderRootShortcutGridSelectionIndicator(
  params: RootShortcutGridSelectionIndicatorRenderParamsShape,
) {
  return <ShortcutSelectionIndicator {...params} />;
}

export function renderRootGridCenterPreview(params: {
  shortcut: Shortcut;
  compactIconSize: number;
  iconCornerRadius: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
}) {
  const compactMetrics = getCompactShortcutCardMetrics({
    shortcut: params.shortcut,
    iconSize: params.compactIconSize,
    allowLargeFolder: params.largeFolderEnabled,
    largeFolderPreviewSize: params.largeFolderPreviewSize,
  });

  return (
    <MergePreviewHighlight
      compactPreviewWidth={compactMetrics.previewSize}
      compactPreviewHeight={compactMetrics.previewSize}
      compactPreviewBorderRadius={compactMetrics.largeFolder
        ? getLargeFolderBorderRadius(compactMetrics.previewSize, params.iconCornerRadius)
        : params.shortcut.kind === 'folder'
          ? getSmallFolderBorderRadius(compactMetrics.previewSize, params.iconCornerRadius)
          : getShortcutIconBorderRadius(params.iconCornerRadius)}
      iconCornerRadius={params.iconCornerRadius}
    />
  );
}

export function resolveLeaftabRootItemLayout(params: {
  shortcut: Shortcut;
  compactIconSize: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
  iconCornerRadius: number;
}) {
  const {
    shortcut,
    compactIconSize,
    largeFolderEnabled,
    largeFolderPreviewSize,
    iconCornerRadius,
  } = params;

  const metrics = getCompactShortcutCardMetrics({
    shortcut,
    iconSize: compactIconSize,
    allowLargeFolder: largeFolderEnabled,
    largeFolderPreviewSize,
  });
  return {
    width: metrics.width,
    height: metrics.height,
    previewRect: {
      left: 0,
      top: 0,
      width: metrics.previewSize,
      height: metrics.previewSize,
      borderRadius: metrics.largeFolder
        ? getLargeFolderBorderRadius(metrics.previewSize, iconCornerRadius)
        : shortcut.kind === 'folder'
          ? getSmallFolderBorderRadius(metrics.previewSize, iconCornerRadius)
          : getShortcutIconBorderRadius(iconCornerRadius),
    },
    previewBorderRadius: metrics.largeFolder
      ? getLargeFolderBorderRadius(metrics.previewSize, iconCornerRadius)
      : shortcut.kind === 'folder'
        ? getSmallFolderBorderRadius(metrics.previewSize, iconCornerRadius)
        : getShortcutIconBorderRadius(iconCornerRadius),
    columnSpan: metrics.columnSpan,
    rowSpan: metrics.rowSpan,
  };
}

export function computeLargeFolderPreviewSize(params: {
  compactIconSize: number;
  columnGap: number;
  rowGap: number;
  gridColumns: number;
  gridWidthPx: number | null;
  largeFolderEnabled: boolean;
}) {
  const { compactIconSize, columnGap, rowGap, gridColumns, gridWidthPx, largeFolderEnabled } = params;
  if (!largeFolderEnabled) return undefined;

  const minimumPreviewSize = compactIconSize * 2 + columnGap;
  const maxPreviewHeight = compactIconSize * 2 + rowGap + COMPACT_SHORTCUT_TITLE_BLOCK_HEIGHT_PX;

  if (!gridWidthPx || gridColumns <= 0) {
    return maxPreviewHeight;
  }

  const gridColumnWidth = (gridWidthPx - columnGap * Math.max(0, gridColumns - 1)) / Math.max(gridColumns, 1);
  const maxPreviewWidth = gridColumnWidth * 2 + columnGap;

  return Math.max(
    minimumPreviewSize,
    Math.floor(Math.min(maxPreviewWidth, maxPreviewHeight)),
  );
}

export function resolveLeaftabFolderItemLayout(params: {
  shortcut: Shortcut;
  compactIconSize: number;
  iconCornerRadius?: number;
}) {
  const { shortcut, compactIconSize, iconCornerRadius } = params;
  const metrics = getCompactShortcutCardMetrics({
    shortcut,
    iconSize: compactIconSize,
  });

  return {
    width: metrics.width,
    height: metrics.height,
    previewRect: {
      left: 0,
      top: 0,
      width: metrics.previewSize,
      height: metrics.previewSize,
      borderRadius: shortcut.kind === 'folder'
        ? (shortcut.folderDisplayMode === 'large'
            ? getLargeFolderBorderRadius(metrics.previewSize, iconCornerRadius ?? 22)
            : getSmallFolderBorderRadius(metrics.previewSize, iconCornerRadius ?? 22))
        : getShortcutIconBorderRadius(iconCornerRadius ?? 22),
    },
    previewBorderRadius: shortcut.kind === 'folder'
      ? (shortcut.folderDisplayMode === 'large'
          ? getLargeFolderBorderRadius(metrics.previewSize, iconCornerRadius ?? 22)
          : getSmallFolderBorderRadius(metrics.previewSize, iconCornerRadius ?? 22))
      : getShortcutIconBorderRadius(iconCornerRadius ?? 22),
  };
}

export function renderLeaftabFolderEmptyState(emptyText: string) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-dashed border-border/80 bg-secondary/20 text-sm text-muted-foreground">
      {emptyText}
    </div>
  );
}

export function renderLeaftabDropPreview(params: {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={params.testId}
      aria-hidden="true"
      className="pointer-events-none absolute z-0 border border-black/15 bg-black/10"
      style={{
        left: params.left,
        top: params.top,
        width: params.width,
        height: params.height,
        borderRadius: params.borderRadius,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.42)',
      }}
    />
  );
}

export function renderLeaftabFolderDropPreview(params: {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
}) {
  return renderLeaftabDropPreview({
    ...params,
    testId: 'folder-shortcut-drop-preview',
  });
}

export function renderLeaftabFolderItem(params: {
  shortcut: Shortcut;
  compactIconSize: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  forceTextWhite: boolean;
  showShortcutTitles: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <ShortcutCardCompact
      shortcut={params.shortcut}
      showTitle={params.showShortcutTitles}
      iconSize={params.compactIconSize}
      iconCornerRadius={params.iconCornerRadius}
      iconAppearance={params.iconAppearance}
      titleFontSize={12}
      forceTextWhite={params.forceTextWhite}
      disableIconWrapperEffects
      iconContentProps={{
        'data-folder-overlay-child-id': params.shortcut.id,
      }}
      onOpen={params.onOpen}
      onContextMenu={params.onContextMenu}
    />
  );
}

export function renderLeaftabFolderDragPreview(params: {
  shortcut: Shortcut;
  compactIconSize: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  forceTextWhite: boolean;
}) {
  return (
    <ShortcutCardCompact
      shortcut={params.shortcut}
      showTitle
      iconSize={params.compactIconSize}
      iconCornerRadius={params.iconCornerRadius}
      iconAppearance={params.iconAppearance}
      titleFontSize={12}
      forceTextWhite={params.forceTextWhite}
      onOpen={() => {}}
      onContextMenu={() => {}}
    />
  );
}
