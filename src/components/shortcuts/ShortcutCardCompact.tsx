import React, { useEffect, useState } from 'react';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import { getCompactShortcutCardMetrics } from '@/components/shortcuts/compactFolderLayout';
import { useFolderPreviewTitleRef } from '@/components/shortcuts/folderPreviewRegistry';
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
  hideFolderPreviewContents?: boolean;
  folderPreviewTone?: 'default' | 'drawer';
  onPreviewShortcutOpen?: (shortcut: Shortcut) => void;
  selectionDisabled?: boolean;
  disableIconWrapperEffects?: boolean;
  animateTitleOnMount?: boolean;
  titleFadeDurationMs?: number;
  folderPortalBackdrop?: boolean;
  rootProps?: Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onClick' | 'onContextMenu'> & {
    [key: `data-${string}`]: string | number | boolean | undefined;
  };
  iconWrapperProps?: Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
    [key: `data-${string}`]: string | number | boolean | undefined;
  };
  iconContentProps?: Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
    [key: `data-${string}`]: string | number | boolean | undefined;
  };
  titleProps?: Omit<React.HTMLAttributes<HTMLParagraphElement>, 'children'> & {
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
  hideFolderPreviewContents = false,
  folderPreviewTone = 'default',
  onPreviewShortcutOpen,
  selectionDisabled = false,
  disableIconWrapperEffects = false,
  animateTitleOnMount = false,
  titleFadeDurationMs = 300,
  folderPortalBackdrop = false,
  rootProps,
  iconWrapperProps,
  iconContentProps,
  titleProps,
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
  const floatingTitle = floatTitle;
  const folderTitleRef = useFolderPreviewTitleRef(folder && folderPortalBackdrop ? shortcut.id : null);
  const [titleFadeReady, setTitleFadeReady] = useState(() => !animateTitleOnMount || !showTitle);
  const iconWrapperMotionClass = disableIconWrapperEffects || firefox || folder || folderSelectionDisabled
    ? ''
    : 'transform-gpu transition-transform duration-150 ease-out will-change-transform group-hover/shortcut:scale-[1.05]';
  const resolvedTitleOpacity = showTitle
    ? (animateTitleOnMount ? (titleFadeReady ? 1 : 0) : 1)
    : 0;

  useEffect(() => {
    if (!animateTitleOnMount) return;
    if (!showTitle) {
      setTitleFadeReady(false);
      return;
    }

    let rafId = window.requestAnimationFrame(() => {
      setTitleFadeReady(true);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [animateTitleOnMount, showTitle, shortcut.id]);

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
                hideFolderPreviewContents={hideFolderPreviewContents}
                folderPreviewTone={folderPreviewTone}
                onOpenFolder={onOpen}
                onPreviewShortcutOpen={onPreviewShortcutOpen}
                selectionDisabled={folderSelectionDisabled}
                folderPortalBackdrop={folderPortalBackdrop}
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
            {...titleProps}
            ref={folderTitleRef}
            className={`pointer-events-none absolute left-1/2 truncate text-center leading-4 transition-opacity duration-300 ease-out ${forceTextWhite ? 'text-white' : 'text-foreground'}`}
            style={{
              top: metrics.previewSize + 4,
              width: metrics.width,
              fontSize: titleFontSize,
              opacity: resolvedTitleOpacity,
              transform: 'translateX(-50%)',
              transitionDuration: `${titleFadeDurationMs}ms`,
              ...titleProps?.style,
            }}
            aria-hidden={!showTitle}
          >
            {shortcut.title}
          </p>
        ) : (
          <p
            {...titleProps}
            ref={folderTitleRef}
            className={`truncate text-center leading-4 transition-opacity duration-300 ease-out ${forceTextWhite ? 'text-white' : 'text-foreground'}`}
            style={{
              width: metrics.width,
              fontSize: titleFontSize,
              opacity: resolvedTitleOpacity,
              transitionDuration: `${titleFadeDurationMs}ms`,
              ...titleProps?.style,
            }}
            aria-hidden={!showTitle}
          >
            {shortcut.title}
          </p>
        )}
      </div>
    </div>
  );
}
