import ShortcutIcon from '@/components/ShortcutIcon';
import { RiFolderChartFill } from '@/icons/ri-compat';
import type { Shortcut } from '@/types';
import { getShortcutChildren } from '@/utils/shortcutFolders';
import { clampShortcutIconCornerRadius, getShortcutIconBorderRadius } from '@/utils/shortcutIconSettings';

const FOLDER_PREVIEW_CONTENT_RATIO = 0.94;
const FOLDER_INLINE_PREVIEW_CONTENT_RATIO = 0.92;
const FOLDER_INLINE_REMOTE_ICON_SCALE = 0.58;
const FOLDER_SHARED_ICON_BASE_SIZE = 72;

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
  const previewIconScale = previewIconSize / FOLDER_SHARED_ICON_BASE_SIZE;

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
      </div>
    </div>
  );
}

type ShortcutFolderPreviewProps = {
  shortcut: Shortcut;
  size: number;
  iconCornerRadius?: number;
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
  const allChildren = getShortcutChildren(shortcut);
  const children = allChildren.slice(0, 4);
  const normalizedCornerRadius = clampShortcutIconCornerRadius(iconCornerRadius);
  const tileSize = Math.max(14, Math.floor((size - 18) / 2));

  return (
    <div
      className="relative grid grid-cols-2 gap-1 border border-black/10 bg-white/72 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:bg-black/26 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      style={{
        width: size,
        height: size,
        borderRadius: getShortcutIconBorderRadius(normalizedCornerRadius),
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
