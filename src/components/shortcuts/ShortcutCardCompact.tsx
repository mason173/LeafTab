import React from 'react';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import { getCompactShortcutCardMetrics } from '@/components/shortcuts/compactFolderLayout';
import { isShortcutFolder } from '@/utils/shortcutFolders';
import { ShortcutVisualRenderer } from './ShortcutVisualRenderer';

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
  floatTitle?: boolean;
  dropTargetActive?: boolean;
  onPreviewShortcutOpen?: (shortcut: Shortcut) => void;
  selectionDisabled?: boolean;
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
  floatTitle = false,
  dropTargetActive = false,
  onPreviewShortcutOpen,
  selectionDisabled = false,
  disableIconWrapperEffects = false,
  rootProps,
  iconWrapperProps,
  iconContentProps,
  onOpen,
  onContextMenu,
}: ShortcutCardCompactProps) {
  const firefox = isFirefoxBuildTarget();
  const folder = isShortcutFolder(shortcut);
  const folderSelectionDisabled = selectionDisabled && folder;
  const metrics = getCompactShortcutCardMetrics({
    shortcut,
    iconSize,
    allowLargeFolder: enableLargeFolder,
    largeFolderPreviewSize,
    ignoreTitleHeight: floatTitle,
  });
  const floatingTitle = showTitle && floatTitle;
  const iconWrapperMotionClass = disableIconWrapperEffects || firefox || folder || folderSelectionDisabled
    ? ''
    : 'transform-gpu transition-transform duration-150 ease-out will-change-transform group-hover/shortcut:scale-[1.05]';

  return (
    <div
      {...rootProps}
      className={`relative rounded-xl select-none group/shortcut ${
        folderSelectionDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${rootProps?.className ?? ''}`}
      style={{ width: metrics.width, overflow: floatingTitle ? 'visible' : undefined, ...rootProps?.style }}
      onClick={onOpen}
      onContextMenu={onContextMenu}
    >
      <div
        className={`flex items-center justify-start ${floatingTitle ? '' : 'flex-col gap-[4px]'}`}
        style={{ width: metrics.width, height: metrics.height }}
      >
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
              <ShortcutVisualRenderer
                shortcut={shortcut}
                previewSize={metrics.previewSize}
                largeFolder={metrics.largeFolder}
                iconSize={iconSize}
                iconCornerRadius={iconCornerRadius}
                iconAppearance={iconAppearance}
                remoteIconScale={remoteIconScale}
                dropTargetActive={dropTargetActive}
                onOpenFolder={onOpen}
                onPreviewShortcutOpen={onPreviewShortcutOpen}
                selectionDisabled={folderSelectionDisabled}
              />
            ) : (
              <ShortcutVisualRenderer
                shortcut={shortcut}
                previewSize={metrics.previewSize}
                iconSize={iconSize}
                iconCornerRadius={iconCornerRadius}
                iconAppearance={iconAppearance}
                remoteIconScale={remoteIconScale}
                dropTargetActive={dropTargetActive}
              />
            )}
          </div>
        </div>
        {floatingTitle ? (
          <p
            className={`pointer-events-none absolute left-1/2 truncate text-center leading-4 transition-opacity duration-150 ${forceTextWhite ? 'text-white' : 'text-foreground'}`}
            style={{
              top: metrics.previewSize + 4,
              width: metrics.width,
              fontSize: titleFontSize,
              opacity: 1,
              transform: 'translateX(-50%)',
            }}
            aria-hidden={false}
          >
            {shortcut.title}
          </p>
        ) : (
          <p
            className={`truncate text-center leading-4 transition-opacity duration-150 ${forceTextWhite ? 'text-white' : 'text-foreground'}`}
            style={{ width: metrics.width, fontSize: titleFontSize, opacity: showTitle ? 1 : 0 }}
            aria-hidden={!showTitle}
          >
            {shortcut.title}
          </p>
        )}
      </div>
    </div>
  );
}
