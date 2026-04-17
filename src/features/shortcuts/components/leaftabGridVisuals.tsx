import React from 'react';
import { RiCheckFill } from '@/icons/ri-compat';
import { DRAG_MOTION_ANIMATIONS_ENABLED } from '@/features/shortcuts/drag/dragAnimationConfig';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import {
  getCompactShortcutCardMetrics,
} from '@/components/shortcuts/compactFolderLayout';
import { ShortcutCardCompact } from '@/components/shortcuts/ShortcutCardCompact';
import { getLargeFolderBorderRadius, getSmallFolderBorderRadius } from '@/components/shortcuts/ShortcutFolderPreview';
import { ShortcutCardRenderer } from '@/components/shortcuts/ShortcutCardRenderer';
import { getShortcutIconBorderRadius } from '@/utils/shortcutIconSettings';
import type {
  FolderShortcutDragPreviewRenderParams,
  FolderShortcutItemRenderParams,
  RootGridCenterPreviewRenderParams,
  RootShortcutGridCardRenderParams,
  RootShortcutGridDragPreviewRenderParams,
  RootShortcutGridSelectionIndicatorRenderParams,
} from './shortcutGridVisualAdapters';

const SELECTION_INDICATOR_SIZE_PX = 16;
const SELECTION_INDICATOR_OFFSET_PX = -4;
const MERGE_PREVIEW_COMPACT_TINT = 'rgba(232, 236, 240, 0.3)';
const DROP_PREVIEW_OPACITY_TRANSITION_MS = 150;

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
}: RootShortcutGridDragPreviewRenderParams) {
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
}: RootShortcutGridSelectionIndicatorRenderParams) {
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

function resolveShortcutPreviewBorderRadius(params: {
  shortcut: Shortcut;
  previewSize: number;
  iconCornerRadius: number;
  allowLargeFolder?: boolean;
}) {
  const { shortcut, previewSize, iconCornerRadius, allowLargeFolder = true } = params;

  if (shortcut.kind !== 'folder') {
    return getShortcutIconBorderRadius(iconCornerRadius);
  }

  if (allowLargeFolder && shortcut.folderDisplayMode === 'large') {
    return getLargeFolderBorderRadius(previewSize, iconCornerRadius);
  }

  return getSmallFolderBorderRadius(previewSize, iconCornerRadius);
}

export function renderRootShortcutGridCard(params: RootShortcutGridCardRenderParams) {
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
      folderDropTargetActive={params.folderDropTargetActive}
      onPreviewShortcutOpen={params.onPreviewShortcutOpen}
      selectionDisabled={params.selectionDisabled}
      shortcut={params.shortcut}
      onOpen={params.onOpen}
      onContextMenu={params.onContextMenu}
    />
  );
}

export function renderRootShortcutGridDragPreview(params: RootShortcutGridDragPreviewRenderParams) {
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
  params: RootShortcutGridSelectionIndicatorRenderParams,
) {
  return <ShortcutSelectionIndicator {...params} />;
}

export function renderRootGridCenterPreview(params: RootGridCenterPreviewRenderParams) {
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
      compactPreviewBorderRadius={resolveShortcutPreviewBorderRadius({
        shortcut: params.shortcut,
        previewSize: compactMetrics.previewSize,
        iconCornerRadius: params.iconCornerRadius,
        allowLargeFolder: compactMetrics.largeFolder,
      })}
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
  const metrics = getCompactShortcutCardMetrics({
    shortcut: params.shortcut,
    iconSize: params.compactIconSize,
    allowLargeFolder: params.largeFolderEnabled,
    largeFolderPreviewSize: params.largeFolderPreviewSize,
  });
  const previewBorderRadius = resolveShortcutPreviewBorderRadius({
    shortcut: params.shortcut,
    previewSize: metrics.previewSize,
    iconCornerRadius: params.iconCornerRadius,
    allowLargeFolder: metrics.largeFolder,
  });

  return {
    width: metrics.previewSize,
    height: metrics.height,
    previewRect: {
      left: 0,
      top: 0,
      width: metrics.previewSize,
      height: metrics.previewSize,
      borderRadius: previewBorderRadius,
    },
    columnSpan: metrics.columnSpan,
    rowSpan: metrics.rowSpan,
    previewBorderRadius,
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
  if (!params.largeFolderEnabled) {
    return undefined;
  }

  const minimumPreviewSize = params.compactIconSize * 2 + params.columnGap;
  const maxPreviewHeight = minimumPreviewSize + params.rowGap + 24 - params.columnGap;

  if (!params.gridWidthPx || params.gridColumns <= 0) {
    return maxPreviewHeight;
  }

  const gridColumnWidth = (params.gridWidthPx - params.columnGap * Math.max(0, params.gridColumns - 1)) / Math.max(params.gridColumns, 1);
  const maxPreviewWidth = gridColumnWidth * 2 + params.columnGap;

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
  const resolvedCornerRadius = iconCornerRadius ?? 22;
  const metrics = getCompactShortcutCardMetrics({
    shortcut,
    iconSize: compactIconSize,
  });
  const previewBorderRadius = resolveShortcutPreviewBorderRadius({
    shortcut,
    previewSize: metrics.previewSize,
    iconCornerRadius: resolvedCornerRadius,
  });

  return {
    width: metrics.width,
    height: metrics.height,
    previewRect: {
      left: 0,
      top: 0,
      width: metrics.previewSize,
      height: metrics.previewSize,
      borderRadius: previewBorderRadius,
    },
    previewBorderRadius,
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
  opacity?: number;
  testId?: string;
}) {
  return <LeaftabDropPreviewNode {...params} />;
}

function LeaftabDropPreviewNode(params: {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
  opacity?: number;
  testId?: string;
}) {
  const [hasAppeared, setHasAppeared] = React.useState(false);

  React.useEffect(() => {
    setHasAppeared(true);
  }, []);

  const resolvedOpacity = DRAG_MOTION_ANIMATIONS_ENABLED
    ? (hasAppeared ? (params.opacity ?? 1) : 0)
    : (params.opacity ?? 1);

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
        opacity: resolvedOpacity,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.42)',
        transition: DRAG_MOTION_ANIMATIONS_ENABLED
          ? `opacity ${DROP_PREVIEW_OPACITY_TRANSITION_MS}ms ease`
          : undefined,
      }}
    />
  );
}

function renderFolderShortcutCard(params: {
  shortcut: Shortcut;
  compactIconSize: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  forceTextWhite: boolean;
  showTitle: boolean;
  iconContentDataId?: string;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <ShortcutCardCompact
      shortcut={params.shortcut}
      showTitle={params.showTitle}
      iconSize={params.compactIconSize}
      iconCornerRadius={params.iconCornerRadius}
      iconAppearance={params.iconAppearance}
      titleFontSize={12}
      forceTextWhite={params.forceTextWhite}
      disableIconWrapperEffects
      iconContentProps={params.iconContentDataId
        ? {
            'data-folder-overlay-child-id': params.iconContentDataId,
          }
        : undefined}
      onOpen={params.onOpen}
      onContextMenu={params.onContextMenu}
    />
  );
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
  return renderFolderShortcutCard({
    ...params,
    showTitle: params.showShortcutTitles,
    iconContentDataId: params.shortcut.id,
  });
}

export function renderLeaftabFolderDragPreview(params: FolderShortcutDragPreviewRenderParams) {
  return renderFolderShortcutCard({
    ...params,
    showTitle: true,
    onOpen: () => {},
    onContextMenu: () => {},
  });
}
