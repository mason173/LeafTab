import React from 'react';
import { RiCheckFill } from '@/icons/ri-compat';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import {
  getCompactShortcutCardMetrics,
} from '@/components/shortcuts/compactFolderLayout';
import { ShortcutCardCompact } from '@/components/shortcuts/ShortcutCardCompact';
import { ShortcutCardRenderer } from '@/components/shortcuts/ShortcutCardRenderer';
import { getLargeFolderBorderRadius, getSmallFolderBorderRadius } from '@/components/shortcuts/ShortcutFolderPreview';
import { getShortcutIconBorderRadius } from '@/utils/shortcutIconSettings';

const SELECTION_INDICATOR_SIZE_PX = 16;
const SELECTION_INDICATOR_OFFSET_PX = -4;

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
  dropTargetActive?: boolean;
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
  compactIconSize,
  iconCornerRadius,
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
      <div className="flex items-center justify-center">
        <DragPreviewIcon shortcut={shortcut} size={compactIconSize} cornerRadius={iconCornerRadius} />
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
      floatTitle
      dropTargetActive={params.dropTargetActive}
      onPreviewShortcutOpen={params.onPreviewShortcutOpen}
      selectionDisabled={params.selectionDisabled}
      folderPortalBackdrop
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
    <ShortcutCardCompact
      shortcut={params.shortcut}
      showTitle={false}
      iconSize={params.compactIconSize}
      iconCornerRadius={params.iconCornerRadius}
      iconAppearance={params.iconAppearance}
      titleFontSize={params.compactTitleFontSize}
      forceTextWhite={params.forceTextWhite}
      enableLargeFolder={params.enableLargeFolder}
      largeFolderPreviewSize={params.largeFolderPreviewSize}
      disableIconWrapperEffects
      folderPortalBackdrop={false}
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

export function renderRootGridCenterPreview(_params: {
  shortcut: Shortcut;
  compactIconSize: number;
  iconCornerRadius: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
}) {
  return null;
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

export function resolveLeaftabShadowPreviewGeometry(params: {
  shortcut: Shortcut;
  iconSize: number;
  iconCornerRadius?: number;
  allowLargeFolder?: boolean;
  largeFolderPreviewSize?: number;
}): {
  shadowWidth: number;
  shadowHeight: number;
  shadowBorderRadius: string;
} {
  const metrics = getCompactShortcutCardMetrics({
    shortcut: params.shortcut,
    iconSize: params.iconSize,
    allowLargeFolder: params.allowLargeFolder,
    largeFolderPreviewSize: params.largeFolderPreviewSize,
  });

  const shadowBorderRadius = params.shortcut.kind === 'folder'
    ? (metrics.largeFolder
        ? getLargeFolderBorderRadius(metrics.previewSize, params.iconCornerRadius ?? 22)
        : getSmallFolderBorderRadius(metrics.previewSize, params.iconCornerRadius ?? 22))
    : getShortcutIconBorderRadius(params.iconCornerRadius ?? 22);

  return {
    shadowWidth: metrics.previewSize,
    shadowHeight: metrics.previewSize,
    shadowBorderRadius,
  };
}

export function renderLeaftabDropPreview(_params: {
  shortcut?: Shortcut;
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
  opacity?: number;
  testId?: string;
  shadowWidth?: number;
  shadowHeight?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBorderRadius?: string;
}) {
  return null;
}

export function renderLeaftabFolderDropPreview(params: {
  shortcut: Shortcut;
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
  shadowWidth?: number;
  shadowHeight?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBorderRadius?: string;
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
      animateTitleOnMount
      titleFadeDurationMs={140}
      iconSize={params.compactIconSize}
      floatTitle
      rootProps={{
        'data-folder-shortcut-grid-item': 'true',
      }}
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
      showTitle={false}
      iconSize={params.compactIconSize}
      iconCornerRadius={params.iconCornerRadius}
      iconAppearance={params.iconAppearance}
      titleFontSize={12}
      forceTextWhite={params.forceTextWhite}
      disableIconWrapperEffects
      onOpen={() => {}}
      onContextMenu={() => {}}
    />
  );
}
