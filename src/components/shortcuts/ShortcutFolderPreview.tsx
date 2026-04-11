import ShortcutIcon from '@/components/ShortcutIcon';
import {
  LARGE_FOLDER_PREVIEW_VISIBLE_COUNT,
} from '@/components/shortcuts/compactFolderLayout';
import { RiFolderChartFill } from '@/icons/ri-compat';
import type { Shortcut } from '@/types';
import { getShortcutChildren } from '@/utils/shortcutFolders';
import { clampShortcutIconCornerRadius } from '@/utils/shortcutIconSettings';

const FOLDER_PREVIEW_CONTENT_RATIO = 0.94;
const FOLDER_INLINE_PREVIEW_CONTENT_RATIO = 0.92;
const FOLDER_INLINE_REMOTE_ICON_SCALE = 0.58;
const FOLDER_SHARED_ICON_BASE_SIZE = 72;
const LARGE_FOLDER_PREVIEW_PADDING = 8;
const LARGE_FOLDER_PREVIEW_GAP = 4;
const LARGE_FOLDER_PREVIEW_CONTENT_RATIO = 0.98;
const LARGE_FOLDER_TRIGGER_ICON_RATIO = 0.76;
const LARGE_FOLDER_TRIGGER_STACK_BAR_HEIGHT = 5;
const LARGE_FOLDER_TRIGGER_STACK_BAR_WIDTH = 18;
const SMALL_FOLDER_PREVIEW_MAX_BORDER_RADIUS_PX = 40;
const LARGE_FOLDER_PREVIEW_MAX_BORDER_RADIUS_PX = 28;

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
  contentSize,
}: {
  child: Shortcut;
  iconCornerRadius: number;
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
        iconRendering={child.iconRendering}
        iconColor={child.iconColor}
        iconCornerRadius={iconCornerRadius}
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
}: {
  child: Shortcut;
  folderId: string;
  index: number;
  tileSize: number;
  iconCornerRadius: number;
}) {
  const previewIconSize = Math.max(16, Math.round(tileSize * FOLDER_PREVIEW_CONTENT_RATIO));

  return (
    <div
      className="flex items-center justify-center"
      style={{ width: tileSize, height: tileSize }}
    >
      <div
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
  onOpenShortcut,
}: {
  child: Shortcut;
  folderId: string;
  index: number;
  tileSize: number;
  iconCornerRadius: number;
  onOpenShortcut?: (shortcut: Shortcut) => void;
}) {
  const previewIconSize = Math.max(18, Math.round(tileSize * LARGE_FOLDER_PREVIEW_CONTENT_RATIO));
  const interactive = typeof onOpenShortcut === 'function';
  const Element = interactive ? 'button' : 'div';

  return (
    <Element
      type={interactive ? 'button' : undefined}
      className={`relative flex items-center justify-center rounded-[14px] ${
        interactive ? 'transition-transform duration-150 ease-out hover:scale-[1.04]' : ''
      }`}
      style={{ width: tileSize, height: tileSize }}
      onClick={interactive ? (event) => {
        event.stopPropagation();
        onOpenShortcut?.(child);
      } : undefined}
    >
      <div
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
  onOpenFolder,
}: {
  child: Shortcut;
  folderId: string;
  index: number;
  tileSize: number;
  iconCornerRadius: number;
  onOpenFolder: () => void;
}) {
  const previewIconSize = Math.max(18, Math.round(tileSize * LARGE_FOLDER_TRIGGER_ICON_RATIO));

  return (
    <button
      type="button"
      className="relative flex items-center justify-center rounded-[14px] transition-transform duration-150 ease-out hover:scale-[1.03]"
      style={{ width: tileSize, height: tileSize }}
      onClick={(event) => {
        event.stopPropagation();
        onOpenFolder();
      }}
    >
      <div
        className="absolute inset-x-0 bottom-[6px] flex flex-col items-center gap-[3px]"
        aria-hidden="true"
      >
        <span
          className="block rounded-full bg-black/22 dark:bg-white/20"
          style={{ width: LARGE_FOLDER_TRIGGER_STACK_BAR_WIDTH * 0.72, height: LARGE_FOLDER_TRIGGER_STACK_BAR_HEIGHT }}
        />
        <span
          className="block rounded-full bg-black/18 dark:bg-white/16"
          style={{ width: LARGE_FOLDER_TRIGGER_STACK_BAR_WIDTH, height: LARGE_FOLDER_TRIGGER_STACK_BAR_HEIGHT }}
        />
      </div>
      <div
        className="relative z-[1] flex items-center justify-center"
        style={{ width: previewIconSize, height: previewIconSize }}
        data-folder-preview-child-id={child.id}
        data-folder-preview-index={index}
        data-folder-preview-parent-id={folderId}
      >
        <FolderPreviewScaledIcon
          child={child}
          contentSize={previewIconSize}
          iconCornerRadius={iconCornerRadius}
        />
      </div>
    </button>
  );
}

type ShortcutFolderPreviewProps = {
  shortcut: Shortcut;
  size: number;
  iconCornerRadius?: number;
};

type ShortcutFolderLargePreviewProps = {
  shortcut: Shortcut;
  size: number;
  iconCornerRadius?: number;
  onOpenFolder: () => void;
  onOpenShortcut?: (shortcut: Shortcut) => void;
};

type ShortcutFolderInlinePreviewProps = {
  shortcut: Shortcut;
  iconSize?: number;
  iconCornerRadius?: number;
  maxIcons?: number;
};

export function ShortcutFolderPreview({
  shortcut,
  size,
  iconCornerRadius = 18,
}: ShortcutFolderPreviewProps) {
  const children = getShortcutChildren(shortcut).slice(0, 4);
  const tileSize = Math.max(14, Math.floor((size - 18) / 2));

  return (
    <div
      className="relative grid grid-cols-2 gap-1 border border-black/10 bg-white/72 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:bg-black/26 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      style={{
        width: size,
        height: size,
        borderRadius: getSmallFolderBorderRadius(size, iconCornerRadius),
      }}
      data-folder-preview="true"
      data-folder-preview-id={shortcut.id}
    >
      {children.length > 0 ? children.map((child, index) => (
        <FolderPreviewTile
          key={child.id}
          child={child}
          folderId={shortcut.id}
          index={index}
          tileSize={tileSize}
          iconCornerRadius={iconCornerRadius}
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
  onOpenFolder,
  onOpenShortcut,
}: ShortcutFolderLargePreviewProps) {
  const children = getShortcutChildren(shortcut);
  const visibleChildren = children.slice(0, LARGE_FOLDER_PREVIEW_VISIBLE_COUNT);
  const directOpenChildren = visibleChildren.length >= LARGE_FOLDER_PREVIEW_VISIBLE_COUNT
    ? visibleChildren.slice(0, LARGE_FOLDER_PREVIEW_VISIBLE_COUNT - 1)
    : visibleChildren;
  const folderOpenShortcut = visibleChildren.length >= LARGE_FOLDER_PREVIEW_VISIBLE_COUNT
    ? visibleChildren[LARGE_FOLDER_PREVIEW_VISIBLE_COUNT - 1]
    : null;
  const tileSize = Math.max(
    24,
    Math.floor((size - LARGE_FOLDER_PREVIEW_PADDING * 2 - LARGE_FOLDER_PREVIEW_GAP * 2) / 3),
  );
  const borderRadius = getLargeFolderBorderRadius(size, iconCornerRadius);

  return (
    <div
      className="relative isolate overflow-hidden border border-black/10 bg-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:bg-black/26 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      style={{
        width: size,
        height: size,
        borderRadius,
      }}
      data-folder-preview="true"
      data-folder-preview-id={shortcut.id}
      onClick={onOpenFolder}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 42%)',
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
                  onOpenFolder={onOpenFolder}
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
            iconRendering={child.iconRendering}
            iconColor={child.iconColor}
            iconCornerRadius={previewIconCornerRadius}
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
