import React from 'react';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import ShortcutIcon from '@/components/ShortcutIcon';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import { getCompactShortcutCardMetrics } from '@/components/shortcuts/compactFolderLayout';
import { ShortcutFolderLargePreview, ShortcutFolderPreview } from './ShortcutFolderPreview';
import { isShortcutFolder } from '@/utils/shortcutFolders';

interface ShortcutCardCompactProps {
  shortcut: Shortcut;
  showTitle: boolean;
  iconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  titleFontSize?: number;
  forceTextWhite?: boolean;
  remoteIconScale?: number;
  enableLargeFolder?: boolean;
  largeFolderPreviewSize?: number;
  onPreviewShortcutOpen?: (shortcut: Shortcut) => void;
  disableIconWrapperEffects?: boolean;
  rootProps?: Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onClick' | 'onContextMenu'> & {
    [key: `data-${string}`]: string | number | boolean | undefined;
  };
  iconWrapperProps?: Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
    [key: `data-${string}`]: string | number | boolean | undefined;
  };
  iconContentProps?: Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
    [key: `data-${string}`]: string | number | boolean | undefined;
  };
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function ShortcutCardCompact({
  shortcut,
  showTitle,
  iconSize = 72,
  iconCornerRadius,
  iconAppearance,
  titleFontSize = 12,
  forceTextWhite = false,
  remoteIconScale = 1,
  enableLargeFolder = false,
  largeFolderPreviewSize,
  onPreviewShortcutOpen,
  disableIconWrapperEffects = false,
  rootProps,
  iconWrapperProps,
  iconContentProps,
  onOpen,
  onContextMenu,
}: ShortcutCardCompactProps) {
  const firefox = isFirefoxBuildTarget();
  const folder = isShortcutFolder(shortcut);
  const metrics = getCompactShortcutCardMetrics({
    shortcut,
    iconSize,
    allowLargeFolder: enableLargeFolder,
    largeFolderPreviewSize,
  });
  const iconWrapperMotionClass = disableIconWrapperEffects || firefox
    ? ''
    : 'transform-gpu transition-transform duration-150 ease-out will-change-transform group-hover/shortcut:scale-[1.05]';

  return (
    <div
      {...rootProps}
      className={`relative rounded-xl cursor-pointer select-none group/shortcut ${rootProps?.className ?? ''}`}
      style={{ width: metrics.width, ...rootProps?.style }}
      onClick={onOpen}
      onContextMenu={onContextMenu}
    >
      <div className="flex flex-col items-center justify-start gap-[4px]" style={{ width: metrics.width, height: metrics.height }}>
        <div
          {...iconWrapperProps}
          className={`relative shrink-0 origin-center ${iconWrapperMotionClass} ${iconWrapperProps?.className ?? ''}`}
          style={{ height: metrics.previewSize, width: metrics.previewSize, ...iconWrapperProps?.style }}
        >
          <div
            {...iconContentProps}
            className={`absolute inset-0 flex items-center justify-center origin-center ${iconContentProps?.className ?? ''}`}
            style={{ ...iconContentProps?.style }}
          >
            {folder ? (
              metrics.largeFolder ? (
                <ShortcutFolderLargePreview
                  shortcut={shortcut}
                  size={metrics.previewSize}
                  iconCornerRadius={iconCornerRadius}
                  iconAppearance={iconAppearance}
                  onOpenFolder={onOpen}
                  onOpenShortcut={onPreviewShortcutOpen}
                />
              ) : (
                <ShortcutFolderPreview
                  shortcut={shortcut}
                  size={metrics.previewSize}
                  iconCornerRadius={iconCornerRadius}
                  iconAppearance={iconAppearance}
                />
              )
            ) : (
              <ShortcutIcon
                icon={shortcut.icon}
                url={shortcut.url}
                shortcutId={shortcut.id}
                size={iconSize}
                exact
                frame="never"
                fallbackStyle="emptyicon"
                fallbackLabel={shortcut.title}
                useOfficialIcon={shortcut.useOfficialIcon}
                autoUseOfficialIcon={shortcut.autoUseOfficialIcon}
                officialIconAvailableAtSave={shortcut.officialIconAvailableAtSave}
                officialIconColorOverride={shortcut.officialIconColorOverride}
                iconRendering={shortcut.iconRendering}
                iconColor={shortcut.iconColor}
                iconCornerRadius={iconCornerRadius}
                iconAppearance={iconAppearance}
                remoteIconScale={remoteIconScale}
              />
            )}
          </div>
        </div>
        <p
          className={`truncate text-center leading-4 transition-opacity duration-150 ${forceTextWhite ? 'text-white' : 'text-foreground'}`}
          style={{ width: metrics.width, fontSize: titleFontSize, opacity: showTitle ? 1 : 0 }}
          aria-hidden={!showTitle}
        >
          {shortcut.title}
        </p>
      </div>
    </div>
  );
}
