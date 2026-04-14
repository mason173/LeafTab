import React from 'react';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import { ShortcutCardCompact } from './ShortcutCardCompact';

interface ShortcutCardRendererProps {
  compactShowTitle: boolean;
  shortcut: Shortcut;
  compactIconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  compactTitleFontSize?: number;
  forceTextWhite?: boolean;
  enableLargeFolder?: boolean;
  largeFolderPreviewSize?: number;
  onPreviewShortcutOpen?: (shortcut: Shortcut) => void;
  selectionDisabled?: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function ShortcutCardRenderer({
  compactShowTitle,
  shortcut,
  compactIconSize,
  iconCornerRadius,
  iconAppearance,
  compactTitleFontSize,
  forceTextWhite = false,
  enableLargeFolder = false,
  largeFolderPreviewSize,
  onPreviewShortcutOpen,
  selectionDisabled = false,
  onOpen,
  onContextMenu,
}: ShortcutCardRendererProps) {
  return (
    <ShortcutCardCompact
      shortcut={shortcut}
      showTitle={compactShowTitle}
      iconSize={compactIconSize}
      iconCornerRadius={iconCornerRadius}
      iconAppearance={iconAppearance}
      titleFontSize={compactTitleFontSize}
      forceTextWhite={forceTextWhite}
      enableLargeFolder={enableLargeFolder}
      largeFolderPreviewSize={largeFolderPreviewSize}
      onPreviewShortcutOpen={onPreviewShortcutOpen}
      selectionDisabled={selectionDisabled}
      onOpen={onOpen}
      onContextMenu={onContextMenu}
    />
  );
}
