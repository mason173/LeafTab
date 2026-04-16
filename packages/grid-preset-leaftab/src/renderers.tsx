import { getShortcutChildren, isShortcutFolder, type Shortcut } from '@leaftab/workspace-core';
import type {
  FolderShortcutSurfaceRenderDragPreviewParams,
  FolderShortcutSurfaceRenderDropPreviewParams,
  FolderShortcutSurfaceRenderItemParams,
  RootShortcutGridRenderCenterPreviewParams,
  RootShortcutGridRenderDragPreviewParams,
  RootShortcutGridRenderDropPreviewParams,
  RootShortcutGridRenderItemParams,
} from '@leaftab/workspace-react';
import React, { type MouseEvent as ReactMouseEvent } from 'react';
import { LEAFTAB_COMPACT_GRID_METRICS } from './constants';
import {
  getLeaftabLargeFolderBorderRadius,
  getLeaftabShortcutIconBorderRadius,
  getLeaftabSmallFolderBorderRadius,
} from './layout';

export type LeaftabShortcutCardMode = 'default' | 'preview' | 'merge-preview';

function detectFirefoxLike() {
  return typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
}

function LeaftabSelectionIndicator({
  compactPreviewSize,
  selected,
  sortId,
}: {
  compactPreviewSize: number;
  selected: boolean;
  sortId: string;
}) {
  return (
    <span
      className="leaftab-selection-indicator"
      style={{
        width: compactPreviewSize,
        height: compactPreviewSize,
      }}
      aria-hidden="true"
    >
      <span
        data-testid={`shortcut-selection-indicator-${sortId}`}
        data-selected={selected}
        className={`leaftab-selection-indicator__badge ${
          selected
            ? 'leaftab-selection-indicator__badge--selected'
            : 'leaftab-selection-indicator__badge--idle'
        }`}
      >
        {selected ? '✓' : null}
      </span>
    </span>
  );
}

function LargeFolderOpenTileGhostStack({
  tileSize,
  previewIconSize,
  iconCornerRadius,
}: {
  tileSize: number;
  previewIconSize: number;
  iconCornerRadius: number;
}) {
  const stackTileSize = Math.min(tileSize - 2, Math.max(16, Math.round(previewIconSize * 0.92)));
  const ghostBorderRadius = getLeaftabShortcutIconBorderRadius(iconCornerRadius);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {[2, 1].map((layer) => (
        <span
          key={layer}
          className="absolute border border-white/20 bg-white/18"
          style={{
            width: stackTileSize,
            height: stackTileSize,
            borderRadius: ghostBorderRadius,
            transform: `translate(${-layer * 4}px, ${-layer * 4}px)`,
            opacity: layer === 1 ? 0.55 : 0.34,
            boxShadow: '0 8px 16px rgba(255,255,255,0.06)',
          }}
        />
      ))}
    </div>
  );
}

function MergePreviewHighlight({
  compactPreviewWidth,
  compactPreviewHeight,
  compactPreviewBorderRadius,
}: {
  compactPreviewWidth: number;
  compactPreviewHeight: number;
  compactPreviewBorderRadius: string;
}) {
  const maskId = React.useId();
  const haloInset = 6;
  const radiusExpansionPx = 4;
  const outerWidth = compactPreviewWidth + haloInset * 2;
  const outerHeight = compactPreviewHeight + haloInset * 2;
  const outerRadius = `calc(${compactPreviewBorderRadius} + ${radiusExpansionPx}px)`;

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
            <rect
              x={haloInset}
              y={haloInset}
              width={compactPreviewWidth}
              height={compactPreviewHeight}
              rx={compactPreviewBorderRadius}
              ry={compactPreviewBorderRadius}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width={outerWidth}
          height={outerHeight}
          rx={outerRadius}
          ry={outerRadius}
          fill="rgba(232, 236, 240, 0.3)"
          mask={`url(#${maskId})`}
        />
      </svg>
    </div>
  );
}

function isLikelyImageSource(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.startsWith('data:image/')
    || normalized.startsWith('blob:')
    || normalized.startsWith('http://')
    || normalized.startsWith('https://')
    || normalized.startsWith('/')
    || normalized.startsWith('./')
    || normalized.startsWith('../')
  );
}

function getShortcutFallbackLabel(shortcut: Shortcut) {
  const explicitLetter = shortcut.iconRendering === 'letter'
    ? shortcut.icon.trim()
    : '';
  const shortNonImageIcon = !isLikelyImageSource(shortcut.icon)
    ? shortcut.icon.trim()
    : '';
  const preferredSeed = (
    explicitLetter
    || (shortNonImageIcon.length > 0 && shortNonImageIcon.length <= 3 ? shortNonImageIcon : '')
  ).trim();
  if (preferredSeed) {
    return preferredSeed.slice(0, 2).toUpperCase();
  }

  const title = shortcut.title.trim();
  if (title) {
    const words = title.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return words.slice(0, 2).map((word) => Array.from(word)[0] ?? '').join('').toUpperCase();
    }
    return title.slice(0, 2).toUpperCase();
  }

  return '?';
}

function LeaftabFolderEmptyGlyph({
  size,
}: {
  size: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="shortcut-folder-icon__empty-glyph"
      style={{ fontSize: Math.max(18, Math.round(size * 0.32)) }}
    >
      □
    </span>
  );
}

export function LeaftabShortcutGlyph({
  shortcut,
  size,
  className = '',
  borderRadius = getLeaftabShortcutIconBorderRadius(),
}: {
  shortcut: Shortcut;
  size: number;
  className?: string;
  borderRadius?: string;
}) {
  const fallbackLabel = getShortcutFallbackLabel(shortcut);

  return (
    <div
      className={['shortcut-glyph', className].filter(Boolean).join(' ')}
      style={{
        width: size,
        height: size,
        borderRadius,
      }}
    >
      <span className="shortcut-glyph__fallback">
        {fallbackLabel}
      </span>
    </div>
  );
}

export function LeaftabFolderPreview({
  shortcut,
  previewSize,
  large,
  iconCornerRadius = LEAFTAB_COMPACT_GRID_METRICS.iconCornerRadius,
}: {
  shortcut: Shortcut;
  previewSize: number;
  large: boolean;
  iconCornerRadius?: number;
}) {
  const children = getShortcutChildren(shortcut).slice(0, large ? 9 : 4);
  const previewBorderRadius = large
    ? getLeaftabLargeFolderBorderRadius(previewSize, iconCornerRadius)
    : getLeaftabSmallFolderBorderRadius(previewSize, iconCornerRadius);

  if (large) {
    const tileGap = 4;
    const padding = 8;
    const tileSize = Math.max(24, Math.floor((previewSize - padding * 2 - tileGap * 2) / 3));
    const hasOverflowChildren = children.length >= 9;
    const directOpenChildren = hasOverflowChildren ? children.slice(0, 8) : children;
    const folderOpenShortcut = hasOverflowChildren ? children[8] : null;
    const previewIconBorderRadius = getLeaftabShortcutIconBorderRadius(iconCornerRadius);

    return (
      <div
        className="shortcut-folder-icon shortcut-folder-icon--large"
        style={{
          width: previewSize,
          height: previewSize,
          padding,
          gap: tileGap,
          borderRadius: previewBorderRadius,
        }}
      >
        <div aria-hidden="true" className="shortcut-folder-icon__sheen" />
        {Array.from({ length: 9 }).map((_, index) => {
          if (children.length === 0 && index === 4) {
            return (
              <div key={`empty-glyph-${shortcut.id}`} className="shortcut-folder-icon__chip shortcut-folder-icon__chip--center">
                <LeaftabFolderEmptyGlyph size={previewSize} />
              </div>
            );
          }

          if (folderOpenShortcut && index === 8) {
            const previewIconSize = Math.max(18, Math.round(tileSize * 0.76));
            return (
              <div key={`open-${folderOpenShortcut.id}`} className="shortcut-folder-icon__chip shortcut-folder-icon__chip--open">
                <div
                  className="shortcut-folder-icon__open-tile"
                  style={{ width: tileSize, height: tileSize }}
                >
                  <LargeFolderOpenTileGhostStack
                    tileSize={tileSize}
                    previewIconSize={previewIconSize}
                    iconCornerRadius={iconCornerRadius}
                  />
                  <LeaftabShortcutGlyph
                    shortcut={folderOpenShortcut}
                    size={previewIconSize}
                    className="shortcut-folder-icon__glyph shortcut-folder-icon__glyph--open"
                    borderRadius={previewIconBorderRadius}
                  />
                </div>
              </div>
            );
          }

          const child = directOpenChildren[index];
          if (!child) {
            return <div key={`empty-${shortcut.id}-${index}`} className="shortcut-folder-icon__chip shortcut-folder-icon__chip--empty" aria-hidden="true" />;
          }

          return (
            <div key={child.id} className="shortcut-folder-icon__chip">
              <LeaftabShortcutGlyph
                shortcut={child}
                size={tileSize}
                className="shortcut-folder-icon__glyph"
                borderRadius={previewIconBorderRadius}
              />
            </div>
          );
        })}
      </div>
    );
  }

  const tileGap = 4;
  const padding = 8;
  const columns = 2;
  const tileSize = Math.floor((previewSize - padding * 2 - tileGap * (columns - 1)) / columns);

  return (
      <div
        className={large ? 'shortcut-folder-icon shortcut-folder-icon--large' : 'shortcut-folder-icon'}
        style={{
          width: previewSize,
          height: previewSize,
        padding,
        gap: tileGap,
          borderRadius: previewBorderRadius,
        }}
      >
      <div aria-hidden="true" className="shortcut-folder-icon__sheen" />
      {children.length > 0 ? children.map((child) => (
        <div key={child.id} className="shortcut-folder-icon__chip">
          <LeaftabShortcutGlyph
            shortcut={child}
            size={tileSize}
            className="shortcut-folder-icon__glyph"
            borderRadius={getLeaftabShortcutIconBorderRadius(iconCornerRadius)}
          />
        </div>
      )) : (
        <div className="shortcut-folder-icon__chip shortcut-folder-icon__chip--full">
          <LeaftabFolderEmptyGlyph size={previewSize} />
        </div>
      )}
      </div>
  );
}

export function LeaftabShortcutCard({
  shortcut,
  mode = 'default',
  centerPreviewActive = false,
  largeFolderPreviewSize,
  compactIconSize = LEAFTAB_COMPACT_GRID_METRICS.iconSize,
  columnGap = LEAFTAB_COMPACT_GRID_METRICS.columnGap,
  iconCornerRadius = LEAFTAB_COMPACT_GRID_METRICS.iconCornerRadius,
}: {
  shortcut: Shortcut;
  mode?: LeaftabShortcutCardMode;
  centerPreviewActive?: boolean;
  largeFolderPreviewSize?: number;
  compactIconSize?: number;
  columnGap?: number;
  iconCornerRadius?: number;
}) {
  const folder = isShortcutFolder(shortcut);
  const largeFolder = folder && shortcut.folderDisplayMode === 'large';
  const previewSize = largeFolder
    ? (largeFolderPreviewSize ?? compactIconSize * LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan + columnGap)
    : compactIconSize;

  return (
    <div
      className={[
        'shortcut-card',
        folder ? 'shortcut-card-folder' : 'shortcut-card-link',
        mode === 'preview' ? 'shortcut-card-preview' : '',
        mode === 'merge-preview' ? 'shortcut-card-merge' : '',
        centerPreviewActive ? 'shortcut-card-center-active' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="shortcut-card__preview">
        {folder ? (
          <LeaftabFolderPreview
            shortcut={shortcut}
            previewSize={previewSize}
            large={largeFolder}
            iconCornerRadius={iconCornerRadius}
          />
        ) : (
          <LeaftabShortcutGlyph
            shortcut={shortcut}
            size={compactIconSize}
            className="shortcut-card__icon-tile"
            borderRadius={getLeaftabShortcutIconBorderRadius(iconCornerRadius)}
          />
        )}
      </div>

      <p className="shortcut-card__title">{shortcut.title}</p>
    </div>
  );
}

function LeaftabLightweightDragPreview({
  shortcut,
  largeFolderPreviewSize,
  compactIconSize = LEAFTAB_COMPACT_GRID_METRICS.iconSize,
  columnGap = LEAFTAB_COMPACT_GRID_METRICS.columnGap,
  iconCornerRadius = LEAFTAB_COMPACT_GRID_METRICS.iconCornerRadius,
}: {
  shortcut: Shortcut;
  largeFolderPreviewSize?: number;
  compactIconSize?: number;
  columnGap?: number;
  iconCornerRadius?: number;
}) {
  const folder = isShortcutFolder(shortcut);
  const largeFolder = folder && shortcut.folderDisplayMode === 'large';
  const previewSize = largeFolder
    ? (largeFolderPreviewSize ?? compactIconSize * LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan + columnGap)
    : compactIconSize;

  return (
    <div className="shortcut-drag-preview">
      <div className="shortcut-drag-preview__icon">
        {folder ? (
          <LeaftabFolderPreview
            shortcut={shortcut}
            previewSize={previewSize}
            large={largeFolder}
            iconCornerRadius={iconCornerRadius}
          />
        ) : (
          <LeaftabShortcutGlyph
            shortcut={shortcut}
            size={compactIconSize}
            className="shortcut-card__icon-tile"
            borderRadius={getLeaftabShortcutIconBorderRadius(iconCornerRadius)}
          />
        )}
      </div>
      <p className="shortcut-drag-preview__title" style={{ width: previewSize }}>
        {shortcut.title}
      </p>
    </div>
  );
}

export function LeaftabMergePreview({
  shortcut,
  largeFolderPreviewSize,
  mergeLabel = 'Drop to merge',
  iconCornerRadius = LEAFTAB_COMPACT_GRID_METRICS.iconCornerRadius,
}: {
  shortcut: Shortcut;
  largeFolderPreviewSize?: number;
  mergeLabel?: string;
  iconCornerRadius?: number;
}) {
  return (
    <div className="merge-preview">
      <span className="merge-preview__eyebrow">{mergeLabel}</span>
      <LeaftabShortcutCard
        shortcut={shortcut}
        mode="merge-preview"
        largeFolderPreviewSize={largeFolderPreviewSize}
        iconCornerRadius={iconCornerRadius}
      />
    </div>
  );
}

export function renderLeaftabRootGridItem(
  params: RootShortcutGridRenderItemParams,
  options?: {
    largeFolderPreviewSize?: number;
    iconCornerRadius?: number;
  },
) {
  return (
    <button
      type="button"
      className="shortcut-button"
      disabled={params.selectionDisabled}
      onClick={params.onOpen}
      onContextMenu={(event) => params.onContextMenu(event as unknown as ReactMouseEvent<HTMLDivElement>)}
    >
      <div className="shortcut-button__content">
        <LeaftabShortcutCard
          shortcut={params.shortcut}
          centerPreviewActive={params.centerPreviewActive}
          largeFolderPreviewSize={options?.largeFolderPreviewSize}
          iconCornerRadius={options?.iconCornerRadius}
        />
        {params.selectionMode ? (
          <LeaftabSelectionIndicator
            compactPreviewSize={
              (isShortcutFolder(params.shortcut) && params.shortcut.folderDisplayMode === 'large')
                ? (options?.largeFolderPreviewSize
                  ?? LEAFTAB_COMPACT_GRID_METRICS.iconSize * LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan
                  + LEAFTAB_COMPACT_GRID_METRICS.columnGap)
                : LEAFTAB_COMPACT_GRID_METRICS.iconSize
            }
            selected={params.selected}
            sortId={params.shortcut.id}
          />
        ) : null}
      </div>
    </button>
  );
}

export function renderLeaftabRootGridDragPreview(
  params: RootShortcutGridRenderDragPreviewParams,
  options?: {
    largeFolderPreviewSize?: number;
    iconCornerRadius?: number;
  },
) {
  if (detectFirefoxLike()) {
    return <LeaftabLightweightDragPreview
      shortcut={params.shortcut}
      largeFolderPreviewSize={options?.largeFolderPreviewSize}
      iconCornerRadius={options?.iconCornerRadius}
    />;
  }

  return (
    <LeaftabShortcutCard
      shortcut={params.shortcut}
      mode="preview"
      largeFolderPreviewSize={options?.largeFolderPreviewSize}
      iconCornerRadius={options?.iconCornerRadius}
    />
  );
}

export function renderLeaftabRootGridCenterPreview(
  params: RootShortcutGridRenderCenterPreviewParams,
  options?: {
    largeFolderPreviewSize?: number;
    iconCornerRadius?: number;
  },
) {
  const iconCornerRadius = options?.iconCornerRadius ?? LEAFTAB_COMPACT_GRID_METRICS.iconCornerRadius;
  const largeFolder = isShortcutFolder(params.shortcut) && params.shortcut.folderDisplayMode === 'large';
  const compactPreviewWidth = largeFolder
    ? (options?.largeFolderPreviewSize
      ?? LEAFTAB_COMPACT_GRID_METRICS.iconSize * LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan
      + LEAFTAB_COMPACT_GRID_METRICS.columnGap)
    : LEAFTAB_COMPACT_GRID_METRICS.iconSize;
  const compactPreviewHeight = compactPreviewWidth;
  const compactPreviewBorderRadius = largeFolder
    ? getLeaftabLargeFolderBorderRadius(compactPreviewWidth, iconCornerRadius)
    : isShortcutFolder(params.shortcut)
      ? getLeaftabSmallFolderBorderRadius(compactPreviewWidth, iconCornerRadius)
      : getLeaftabShortcutIconBorderRadius(iconCornerRadius);

  return (
    <MergePreviewHighlight
      compactPreviewWidth={compactPreviewWidth}
      compactPreviewHeight={compactPreviewHeight}
      compactPreviewBorderRadius={compactPreviewBorderRadius}
    />
  );
}

export function renderLeaftabFolderSurfaceItem(
  params: FolderShortcutSurfaceRenderItemParams,
  options?: {
    largeFolderPreviewSize?: number;
    iconCornerRadius?: number;
  },
) {
  return (
    <button
      type="button"
      className="shortcut-button"
      onClick={params.onOpen}
      onContextMenu={(event) => params.onContextMenu(event as unknown as ReactMouseEvent<HTMLDivElement>)}
    >
      <LeaftabShortcutCard
        shortcut={params.shortcut}
        mode={params.isDragging ? 'preview' : 'default'}
        largeFolderPreviewSize={options?.largeFolderPreviewSize}
        iconCornerRadius={options?.iconCornerRadius}
      />
    </button>
  );
}

export function renderLeaftabFolderSurfaceDragPreview(
  params: FolderShortcutSurfaceRenderDragPreviewParams,
  options?: {
    largeFolderPreviewSize?: number;
    iconCornerRadius?: number;
  },
) {
  if (detectFirefoxLike()) {
    return <LeaftabLightweightDragPreview
      shortcut={params.shortcut}
      largeFolderPreviewSize={options?.largeFolderPreviewSize}
      iconCornerRadius={options?.iconCornerRadius}
    />;
  }

  return (
    <LeaftabShortcutCard
      shortcut={params.shortcut}
      mode="preview"
      largeFolderPreviewSize={options?.largeFolderPreviewSize}
      iconCornerRadius={options?.iconCornerRadius}
    />
  );
}

export function renderLeaftabDropPreview(
  preview: RootShortcutGridRenderDropPreviewParams | FolderShortcutSurfaceRenderDropPreviewParams,
  options?: {
    borderRadius?: string;
  },
) {
  return (
    <div
      aria-hidden="true"
      className="drop-preview"
      style={{
        left: preview.left,
        top: preview.top,
        width: preview.width,
        height: preview.height,
        borderRadius: options?.borderRadius ?? preview.borderRadius ?? '24px',
      }}
    />
  );
}
