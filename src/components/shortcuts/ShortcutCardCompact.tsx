import React from 'react';
import { Shortcut } from '@/types';
import ShortcutIcon from '@/components/ShortcutIcon';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import { ShortcutFolderPreview } from './ShortcutFolderPreview';
import { isShortcutFolder } from '@/utils/shortcutFolders';

interface ShortcutCardCompactProps {
  shortcut: Shortcut;
  showTitle: boolean;
  iconSize?: number;
  iconCornerRadius?: number;
  titleFontSize?: number;
  forceTextWhite?: boolean;
  remoteIconScale?: number;
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
  titleFontSize = 12,
  forceTextWhite = false,
  remoteIconScale = 1,
  disableIconWrapperEffects = false,
  rootProps,
  iconWrapperProps,
  iconContentProps,
  onOpen,
  onContextMenu,
}: ShortcutCardCompactProps) {
  const firefox = isFirefoxBuildTarget();
  const titleBlockHeight = 24;
  const totalHeight = iconSize + titleBlockHeight;
  const folder = isShortcutFolder(shortcut);
  const iconWrapperMotionClass = disableIconWrapperEffects || firefox
    ? ''
    : 'transform-gpu transition-transform duration-150 ease-out will-change-transform group-hover/shortcut:scale-[1.05]';
  return (
    <div
      {...rootProps}
      className={`relative rounded-xl cursor-pointer select-none group/shortcut ${rootProps?.className ?? ''}`}
      style={{ width: iconSize, ...rootProps?.style }}
      onClick={onOpen}
      onContextMenu={onContextMenu}
    >
      <div className="flex flex-col items-center justify-start gap-[4px]" style={{ width: iconSize, height: totalHeight }}>
        <div
          {...iconWrapperProps}
          className={`relative shrink-0 origin-center ${iconWrapperMotionClass} ${iconWrapperProps?.className ?? ''}`}
          style={{ height: iconSize, width: iconSize, ...iconWrapperProps?.style }}
        >
          <div
            {...iconContentProps}
            className={`absolute inset-0 flex items-center justify-center origin-center ${iconContentProps?.className ?? ''}`}
            style={{ ...iconContentProps?.style }}
          >
            {folder ? (
              <ShortcutFolderPreview
                shortcut={shortcut}
                size={iconSize}
                iconCornerRadius={iconCornerRadius}
              />
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
                iconRendering={shortcut.iconRendering}
                iconColor={shortcut.iconColor}
                iconCornerRadius={iconCornerRadius}
                remoteIconScale={remoteIconScale}
              />
            )}
          </div>
        </div>
        <p
          className={`truncate text-center leading-4 transition-opacity duration-150 ${forceTextWhite ? 'text-white' : 'text-foreground'}`}
          style={{ width: iconSize, fontSize: titleFontSize, opacity: showTitle ? 1 : 0 }}
          aria-hidden={!showTitle}
        >
          {shortcut.title}
        </p>
      </div>
    </div>
  );
}
