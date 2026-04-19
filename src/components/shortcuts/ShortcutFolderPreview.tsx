import { useFolderPreviewRootRef, useFolderPreviewSlotRef } from '@/components/shortcuts/folderPreviewRegistry';
import ShortcutIcon from '@/components/ShortcutIcon';
import {
  COMPACT_SHORTCUT_GRID_COLUMN_GAP_PX,
  LARGE_FOLDER_PREVIEW_VISIBLE_COUNT,
} from '@/components/shortcuts/compactFolderLayout';
import { RiFolderChartFill } from '@/icons/ri-compat';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import { getShortcutChildren } from '@/utils/shortcutFolders';
import { clampShortcutIconCornerRadius, getShortcutIconBorderRadius } from '@/utils/shortcutIconSettings';

const FOLDER_PREVIEW_CONTENT_RATIO = 0.94;
const FOLDER_INLINE_PREVIEW_CONTENT_RATIO = 0.92;
const FOLDER_INLINE_REMOTE_ICON_SCALE = 0.58;
const FOLDER_SHARED_ICON_BASE_SIZE = 72;
const LARGE_FOLDER_PREVIEW_PADDING = 8;
const LARGE_FOLDER_PREVIEW_GAP = 4;
const LARGE_FOLDER_PREVIEW_CONTENT_RATIO = 0.98;
const LARGE_FOLDER_TRIGGER_ICON_RATIO = 0.76;
const SMALL_FOLDER_PREVIEW_MAX_BORDER_RADIUS_PX = 40;
const LARGE_FOLDER_PREVIEW_MAX_BORDER_RADIUS_PX = 28;
const LARGE_FOLDER_TRIGGER_STACK_OFFSET_STEP_PX = 4;
const FOLDER_PREVIEW_BACKDROP_BLUR_PX = 16;
export const LIGHT_FOLDER_SURFACE_CLASSNAME = 'border-black/6 bg-[rgba(205,212,220,0.4)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]';
const FOLDER_DROP_TARGET_TRANSITION = 'none';
const FOLDER_DROP_TARGET_FADE_TRANSITION = 'none';
const ACTIVE_FOLDER_BORDER_COLOR = 'rgba(255,255,255,0.3)';
const ACTIVE_FOLDER_BORDER_SHADOW = 'inset 0 0 0 1px rgba(255,255,255,0.16), inset 0 1px 0 rgba(255,255,255,0.28), 0 0 0 1px rgba(255,255,255,0.08)';

function buildFolderSurfaceInteractionStyle(highlightBorder: boolean) {
  return {
    transition: FOLDER_DROP_TARGET_TRANSITION,
    borderColor: highlightBorder ? ACTIVE_FOLDER_BORDER_COLOR : undefined,
    boxShadow: highlightBorder ? ACTIVE_FOLDER_BORDER_SHADOW : undefined,
  };
}

function LargeFolderOpenTileGhostStack({
  tileSize,
  previewIconSize,
  iconCornerRadius,
  fadeWhenDropTargetActive = false,
}: {
  tileSize: number;
  previewIconSize: number;
  iconCornerRadius: number;
  fadeWhenDropTargetActive?: boolean;
}) {
  const stackTileSize = Math.min(tileSize - 2, Math.max(16, Math.round(previewIconSize * 0.92)));
  const ghostBorderRadius = getShortcutIconBorderRadius(iconCornerRadius);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{
        opacity: fadeWhenDropTargetActive ? 0.01 : 1,
        transition: FOLDER_DROP_TARGET_FADE_TRANSITION,
      }}
      data-folder-preview-open-tile-ghost-stack="true"
    >
      {[2, 1].map((layer) => (
        <span
          key={layer}
          className="absolute border border-white/20 bg-white/18"
          style={{
            width: stackTileSize,
            height: stackTileSize,
            borderRadius: ghostBorderRadius,
            transform: `translate(${-layer * LARGE_FOLDER_TRIGGER_STACK_OFFSET_STEP_PX}px, ${-layer * LARGE_FOLDER_TRIGGER_STACK_OFFSET_STEP_PX}px)`,
            opacity: layer === 1 ? 0.55 : 0.34,
            boxShadow: '0 8px 16px rgba(255,255,255,0.06)',
          }}
        />
      ))}
    </div>
  );
}

function getFolderPreviewBorderRadius(params: {
  size: number;
  iconCornerRadius: number;
  maxRadiusPx: number;
  sizeRadiusRatio: number;
}): string {
  const { size, iconCornerRadius, maxRadiusPx, sizeRadiusRatio } = params;
  const normalizedCornerRadius = clampShortcutIconCornerRadius(iconCornerRadius);
  const resolvedRadiusPx = Math.min(
    maxRadiusPx,
    Math.round(FOLDER_SHARED_ICON_BASE_SIZE * normalizedCornerRadius / 100),
    Math.round(size * sizeRadiusRatio),
  );
  return `${Math.max(0, resolvedRadiusPx)}px`;
}

export function getSmallFolderBorderRadius(size: number, iconCornerRadius: number): string {
  return getFolderPreviewBorderRadius({
    size,
    iconCornerRadius,
    maxRadiusPx: SMALL_FOLDER_PREVIEW_MAX_BORDER_RADIUS_PX,
    sizeRadiusRatio: 0.3,
  });
}

export function getLargeFolderBorderRadius(size: number, iconCornerRadius: number): string {
  return getFolderPreviewBorderRadius({
    size,
    iconCornerRadius,
    maxRadiusPx: LARGE_FOLDER_PREVIEW_MAX_BORDER_RADIUS_PX,
    sizeRadiusRatio: 0.18,
  });
}

function FolderPreviewScaledIcon({
  child,
  iconCornerRadius,
  iconAppearance,
  contentSize,
}: {
  child: Shortcut;
  iconCornerRadius: number;
  iconAppearance?: ShortcutIconAppearance;
  contentSize: number;
}) {
  const previewIconScale = contentSize / FOLDER_SHARED_ICON_BASE_SIZE;

  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: FOLDER_SHARED_ICON_BASE_SIZE,
        height: FOLDER_SHARED_ICON_BASE_SIZE,
        transform: `scale(${previewIconScale})`,
        transformOrigin: 'center center',
        willChange: 'transform',
      }}
    >
      <ShortcutIcon
        icon={child.icon}
        url={child.url}
        shortcutId={child.id}
        size={FOLDER_SHARED_ICON_BASE_SIZE}
        exact
        frame="never"
        fallbackStyle="emptyicon"
        fallbackLabel={child.title}
        useOfficialIcon={child.useOfficialIcon}
        autoUseOfficialIcon={child.autoUseOfficialIcon}
        officialIconAvailableAtSave={child.officialIconAvailableAtSave}
        officialIconColorOverride={child.officialIconColorOverride}
        iconRendering={child.iconRendering}
        iconColor={child.iconColor}
        iconCornerRadius={iconCornerRadius}
        iconAppearance={iconAppearance}
        remoteIconScale={1}
      />
    </div>
  );
}

function FolderPreviewTile({
  child,
  folderId,
  index,
  tileSize,
  iconCornerRadius,
  iconAppearance,
}: {
  child: Shortcut;
  folderId: string;
  index: number;
  tileSize: number;
  iconCornerRadius: number;
  iconAppearance?: ShortcutIconAppearance;
}) {
  const previewIconSize = Math.max(16, Math.round(tileSize * FOLDER_PREVIEW_CONTENT_RATIO));
  const previewSlotRef = useFolderPreviewSlotRef(folderId, child.id, index);

  return (
    <div
      className="flex items-center justify-center"
      style={{ width: tileSize, height: tileSize }}
    >
      <div
        ref={previewSlotRef}
        className="flex items-center justify-center"
        style={{ width: previewIconSize, height: previewIconSize }}
        data-folder-preview-child-id={child.id}
        data-folder-preview-index={index}
        data-folder-preview-parent-id={folderId}
      >
        <FolderPreviewScaledIcon
          child={child}
          contentSize={previewIconSize}
          iconCornerRadius={iconCornerRadius}
          iconAppearance={iconAppearance}
        />
      </div>
    </div>
  );
}

function LargeFolderPreviewTile({
  child,
  folderId,
  index,
  tileSize,
  iconCornerRadius,
  iconAppearance,
  onOpenShortcut,
}: {
  child: Shortcut;
  folderId: string;
  index: number;
  tileSize: number;
  iconCornerRadius: number;
  iconAppearance?: ShortcutIconAppearance;
  onOpenShortcut?: (shortcut: Shortcut) => void;
}) {
  const previewIconSize = Math.max(18, Math.round(tileSize * LARGE_FOLDER_PREVIEW_CONTENT_RATIO));
  const interactive = typeof onOpenShortcut === 'function';
  const Element = interactive ? 'button' : 'div';
  const previewSlotRef = useFolderPreviewSlotRef(folderId, child.id, index);

  return (
    <Element
      type={interactive ? 'button' : undefined}
      className="relative flex items-center justify-center rounded-[14px]"
      style={{ width: tileSize, height: tileSize }}
      data-folder-preview-large-tile="true"
      data-folder-preview-hover-scale-enabled="false"
      onClick={interactive ? (event) => {
        event.stopPropagation();
        onOpenShortcut?.(child);
      } : undefined}
    >
      <div
        ref={previewSlotRef}
        className="flex items-center justify-center"
        style={{ width: previewIconSize, height: previewIconSize }}
        data-folder-preview-child-id={child.id}
        data-folder-preview-index={index}
        data-folder-preview-parent-id={folderId}
      >
        <FolderPreviewScaledIcon
          child={child}
          contentSize={previewIconSize}
          iconCornerRadius={iconCornerRadius}
          iconAppearance={iconAppearance}
        />
      </div>
    </Element>
  );
}

function LargeFolderOpenTile({
  child,
  folderId,
  index,
  tileSize,
  iconCornerRadius,
  iconAppearance,
  onOpenFolder,
  fadeContentWhenDropTargetActive = false,
}: {
  child: Shortcut;
  folderId: string;
  index: number;
  tileSize: number;
  iconCornerRadius: number;
  iconAppearance?: ShortcutIconAppearance;
  onOpenFolder?: () => void;
  fadeContentWhenDropTargetActive?: boolean;
}) {
  const previewIconSize = Math.max(18, Math.round(tileSize * LARGE_FOLDER_TRIGGER_ICON_RATIO));
  const interactive = typeof onOpenFolder === 'function';
  const previewSlotRef = useFolderPreviewSlotRef(folderId, child.id, index);

  return (
    <button
      type="button"
      className={`relative isolate flex items-center justify-center rounded-[14px] ${
        interactive
          ? ''
          : 'cursor-not-allowed'
      }`}
      style={{ width: tileSize, height: tileSize }}
      data-folder-preview-open-tile="true"
      data-folder-preview-hover-scale-enabled="false"
      onClick={interactive ? (event) => {
        event.stopPropagation();
        onOpenFolder?.();
      } : undefined}
      disabled={!interactive}
    >
      <LargeFolderOpenTileGhostStack
        tileSize={tileSize}
        previewIconSize={previewIconSize}
        iconCornerRadius={iconCornerRadius}
        fadeWhenDropTargetActive={fadeContentWhenDropTargetActive}
      />
      <div
        ref={previewSlotRef}
        className="relative z-[1] flex items-center justify-center"
        style={{
          width: previewIconSize,
          height: previewIconSize,
          opacity: fadeContentWhenDropTargetActive ? 0.01 : 1,
          transition: FOLDER_DROP_TARGET_FADE_TRANSITION,
        }}
        data-folder-preview-child-id={child.id}
        data-folder-preview-index={index}
        data-folder-preview-parent-id={folderId}
        data-folder-preview-open-tile-icon="true"
      >
        <FolderPreviewScaledIcon
          child={child}
          contentSize={previewIconSize}
          iconCornerRadius={iconCornerRadius}
          iconAppearance={iconAppearance}
        />
      </div>
    </button>
  );
}

type ShortcutFolderPreviewProps = {
  shortcut: Shortcut;
  size: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  highlightBorder?: boolean;
  selectionDisabled?: boolean;
};

type ShortcutFolderLargePreviewProps = {
  shortcut: Shortcut;
  size: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  highlightBorder?: boolean;
  onOpenFolder?: () => void;
  onOpenShortcut?: (shortcut: Shortcut) => void;
};

type ShortcutFolderInlinePreviewProps = {
  shortcut: Shortcut;
  iconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  maxIcons?: number;
};

export function ShortcutFolderPreview({
  shortcut,
  size,
  iconCornerRadius = 18,
  iconAppearance,
  highlightBorder = false,
  selectionDisabled = false,
}: ShortcutFolderPreviewProps) {
  const children = getShortcutChildren(shortcut).slice(0, 4);
  const tileSize = Math.max(14, Math.floor((size - 18) / 2));
  const folderPreviewRootRef = useFolderPreviewRootRef(shortcut.id);

  return (
    <div
      ref={folderPreviewRootRef}
      className={`relative grid grid-cols-2 gap-1 border p-2 ${LIGHT_FOLDER_SURFACE_CLASSNAME} ${
        selectionDisabled ? 'cursor-not-allowed' : ''
      } dark:border-white/10 dark:bg-black/26 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`}
      style={{
        width: size,
        height: size,
        borderRadius: getSmallFolderBorderRadius(size, iconCornerRadius),
        backdropFilter: `blur(${FOLDER_PREVIEW_BACKDROP_BLUR_PX}px)`,
        WebkitBackdropFilter: `blur(${FOLDER_PREVIEW_BACKDROP_BLUR_PX}px)`,
        ...buildFolderSurfaceInteractionStyle(highlightBorder),
      }}
      data-folder-preview="true"
      data-folder-preview-id={shortcut.id}
      data-folder-drop-target-active={highlightBorder ? 'true' : 'false'}
    >
      {children.length > 0 ? children.map((child, index) => (
        <FolderPreviewTile
          key={child.id}
          child={child}
          folderId={shortcut.id}
          index={index}
          tileSize={tileSize}
          iconCornerRadius={iconCornerRadius}
          iconAppearance={iconAppearance}
        />
      )) : (
        <div className="col-span-2 flex items-center justify-center text-muted-foreground" style={{ fontSize: Math.max(18, Math.round(size * 0.34)) }}>
          <RiFolderChartFill aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export function ShortcutFolderLargePreview({
  shortcut,
  size,
  iconCornerRadius = 18,
  iconAppearance,
  highlightBorder = false,
  onOpenFolder,
  onOpenShortcut,
}: ShortcutFolderLargePreviewProps) {
  const interactive = typeof onOpenFolder === 'function';
  const children = getShortcutChildren(shortcut);
  const hasOverflowChildren = children.length >= LARGE_FOLDER_PREVIEW_VISIBLE_COUNT;
  const visibleChildren = children.slice(0, LARGE_FOLDER_PREVIEW_VISIBLE_COUNT);
  const directOpenChildren = hasOverflowChildren
    ? visibleChildren.slice(0, LARGE_FOLDER_PREVIEW_VISIBLE_COUNT - 1)
    : visibleChildren;
  const folderOpenShortcut = hasOverflowChildren
    ? visibleChildren[LARGE_FOLDER_PREVIEW_VISIBLE_COUNT - 1]
    : null;
  const tileSize = Math.max(
    24,
    Math.floor((size - LARGE_FOLDER_PREVIEW_PADDING * 2 - LARGE_FOLDER_PREVIEW_GAP * 2) / 3),
  );
  const borderRadius = getLargeFolderBorderRadius(size, iconCornerRadius);
  const folderPreviewRootRef = useFolderPreviewRootRef(shortcut.id);

  return (
    <div
      ref={folderPreviewRootRef}
      className={`relative isolate overflow-hidden border ${LIGHT_FOLDER_SURFACE_CLASSNAME} ${
        interactive ? '' : 'cursor-not-allowed'
      } dark:border-white/10 dark:bg-black/26 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`}
      style={{
        width: size,
        height: size,
        borderRadius,
        backdropFilter: `blur(${FOLDER_PREVIEW_BACKDROP_BLUR_PX}px)`,
        WebkitBackdropFilter: `blur(${FOLDER_PREVIEW_BACKDROP_BLUR_PX}px)`,
        ...buildFolderSurfaceInteractionStyle(highlightBorder),
      }}
      data-folder-preview="true"
      data-folder-preview-id={shortcut.id}
      data-folder-drop-target-active={highlightBorder ? 'true' : 'false'}
      onClick={interactive ? onOpenFolder : undefined}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 42%)',
          pointerEvents: 'none',
        }}
      />
      {children.length > 0 ? (
        <div
          className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 grid-cols-3"
          style={{
            width: tileSize * 3 + LARGE_FOLDER_PREVIEW_GAP * 2,
            height: tileSize * 3 + LARGE_FOLDER_PREVIEW_GAP * 2,
            columnGap: LARGE_FOLDER_PREVIEW_GAP,
            rowGap: LARGE_FOLDER_PREVIEW_GAP,
          }}
        >
          {Array.from({ length: LARGE_FOLDER_PREVIEW_VISIBLE_COUNT }).map((_, index) => {
            if (folderOpenShortcut && index === LARGE_FOLDER_PREVIEW_VISIBLE_COUNT - 1) {
              return (
                <LargeFolderOpenTile
                  key={`open-${folderOpenShortcut.id}`}
                  child={folderOpenShortcut}
                  folderId={shortcut.id}
                  index={index}
                  tileSize={tileSize}
                  iconCornerRadius={iconCornerRadius}
                  iconAppearance={iconAppearance}
                  fadeContentWhenDropTargetActive={highlightBorder}
                  onOpenFolder={interactive ? onOpenFolder : undefined}
                />
              );
            }

            const child = directOpenChildren[index];
            if (!child) {
              return <div key={`empty-${shortcut.id}-${index}`} aria-hidden="true" />;
            }

            return (
              <LargeFolderPreviewTile
                key={child.id}
                child={child}
                folderId={shortcut.id}
                index={index}
                tileSize={tileSize}
                iconCornerRadius={iconCornerRadius}
                iconAppearance={iconAppearance}
                onOpenShortcut={onOpenShortcut}
              />
            );
          })}
        </div>
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-white/80"
          style={{ fontSize: Math.max(22, Math.round(size * 0.28)) }}
        >
          <RiFolderChartFill aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export function ShortcutFolderInlinePreview({
  shortcut,
  iconSize = 22,
  iconCornerRadius = 18,
  iconAppearance,
  maxIcons = 4,
}: ShortcutFolderInlinePreviewProps) {
  const children = getShortcutChildren(shortcut).slice(0, Math.max(2, maxIcons));
  const previewIconSize = Math.max(12, Math.round(iconSize * FOLDER_INLINE_PREVIEW_CONTENT_RATIO));
  const previewIconCornerRadius = clampShortcutIconCornerRadius(iconCornerRadius);

  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden">
      {children.length > 0 ? children.map((child) => (
        <div
          key={child.id}
          className="flex shrink-0 items-center justify-center"
          style={{ width: iconSize, height: iconSize }}
        >
          <ShortcutIcon
            icon={child.icon}
            url={child.url}
            shortcutId={child.id}
            size={previewIconSize}
            exact
            frame="never"
            fallbackStyle="emptyicon"
            fallbackLabel={child.title}
            fallbackLetterSize={Math.max(9, Math.round(previewIconSize * 0.44))}
            useOfficialIcon={child.useOfficialIcon}
            autoUseOfficialIcon={child.autoUseOfficialIcon}
            officialIconAvailableAtSave={child.officialIconAvailableAtSave}
            officialIconColorOverride={child.officialIconColorOverride}
            iconRendering={child.iconRendering}
            iconColor={child.iconColor}
            iconCornerRadius={previewIconCornerRadius}
            iconAppearance={iconAppearance}
            remoteIconScale={FOLDER_INLINE_REMOTE_ICON_SCALE}
          />
        </div>
      )) : (
        <div
          className="flex shrink-0 items-center justify-center text-muted-foreground"
          style={{ width: iconSize, height: iconSize, fontSize: Math.max(16, Math.round(iconSize * 0.8)) }}
        >
          <RiFolderChartFill aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export {
  COMPACT_SHORTCUT_GRID_COLUMN_GAP_PX,
};
