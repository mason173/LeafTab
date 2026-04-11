import ShortcutIcon from '@/components/ShortcutIcon';
import { RiFolderChartFill } from '@/icons/ri-compat';
import type { Shortcut } from '@/types';
import { getShortcutChildren } from '@/utils/shortcutFolders';
import { clampShortcutIconCornerRadius, getShortcutIconBorderRadius } from '@/utils/shortcutIconSettings';

type ShortcutFolderPreviewProps = {
  shortcut: Shortcut;
  size: number;
  iconCornerRadius?: number;
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
  const tileRadius = Math.max(6, Math.round(size * normalizedCornerRadius / 250));

  return (
    <div
      className="relative grid grid-cols-2 gap-1 border border-border/60 bg-secondary/35 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
      style={{
        width: size,
        height: size,
        borderRadius: getShortcutIconBorderRadius(normalizedCornerRadius),
      }}
    >
      {children.length > 0 ? children.map((child) => (
        <div
          key={child.id}
          className="overflow-hidden bg-background/80"
          style={{ width: tileSize, height: tileSize, borderRadius: tileRadius }}
        >
          <ShortcutIcon
            icon={child.icon}
            url={child.url}
            shortcutId={child.id}
            size={tileSize}
            exact
            frame="never"
            fallbackStyle="emptyicon"
            fallbackLabel={child.title}
            useOfficialIcon={child.useOfficialIcon}
            autoUseOfficialIcon={child.autoUseOfficialIcon}
            officialIconAvailableAtSave={child.officialIconAvailableAtSave}
            iconRendering={child.iconRendering}
            iconColor={child.iconColor}
            iconCornerRadius={Math.max(8, iconCornerRadius * 0.45)}
          />
        </div>
      )) : (
        <div className="col-span-2 flex items-center justify-center text-muted-foreground" style={{ fontSize: Math.max(18, Math.round(size * 0.34)) }}>
          <RiFolderChartFill aria-hidden="true" />
        </div>
      )}
      {allChildren.length > 0 ? (
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-background/92 px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground shadow-sm">
          {allChildren.length}
        </span>
      ) : null}
    </div>
  );
}
