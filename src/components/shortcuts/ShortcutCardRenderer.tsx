import React from 'react';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import { ShortcutCardCompact } from './ShortcutCardCompact';

interface ShortcutCardRendererProps {
  compactShowTitle: boolean;
  shortcut: Shortcut;
  highlighted?: boolean;
  compactIconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  compactTitleFontSize?: number;
  forceTextWhite?: boolean;
  enableLargeFolder?: boolean;
  largeFolderPreviewSize?: number;
  floatTitle?: boolean;
  dropTargetActive?: boolean;
  hideFolderPreviewContents?: boolean;
  folderPreviewTone?: 'default' | 'drawer';
  onPreviewShortcutOpen?: (shortcut: Shortcut) => void;
  selectionDisabled?: boolean;
  folderPortalBackdrop?: boolean;
  rootProps?: React.ComponentProps<typeof ShortcutCardCompact>['rootProps'];
  iconContentProps?: React.ComponentProps<typeof ShortcutCardCompact>['iconContentProps'];
  titleProps?: React.ComponentProps<typeof ShortcutCardCompact>['titleProps'];
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function ShortcutCardRenderer({
  compactShowTitle,
  shortcut,
  highlighted = false,
  compactIconSize,
  iconCornerRadius,
  iconAppearance,
  compactTitleFontSize,
  forceTextWhite = false,
  enableLargeFolder = false,
  largeFolderPreviewSize,
  floatTitle = false,
  dropTargetActive = false,
  hideFolderPreviewContents = false,
  folderPreviewTone = 'default',
  onPreviewShortcutOpen,
  selectionDisabled = false,
  folderPortalBackdrop = false,
  rootProps,
  iconContentProps,
  titleProps,
  onOpen,
  onContextMenu,
}: ShortcutCardRendererProps) {
  return (
    <ShortcutCardCompact
      shortcut={shortcut}
      highlighted={highlighted}
      showTitle={compactShowTitle}
      iconSize={compactIconSize}
      iconCornerRadius={iconCornerRadius}
      iconAppearance={iconAppearance}
      titleFontSize={compactTitleFontSize}
      forceTextWhite={forceTextWhite}
      enableLargeFolder={enableLargeFolder}
      largeFolderPreviewSize={largeFolderPreviewSize}
      floatTitle={floatTitle}
      dropTargetActive={dropTargetActive}
      hideFolderPreviewContents={hideFolderPreviewContents}
      folderPreviewTone={folderPreviewTone}
      onPreviewShortcutOpen={onPreviewShortcutOpen}
      selectionDisabled={selectionDisabled}
      folderPortalBackdrop={folderPortalBackdrop}
      rootProps={rootProps}
      iconContentProps={iconContentProps}
      titleProps={titleProps}
      onOpen={onOpen}
      onContextMenu={onContextMenu}
    />
  );
}
