import React from 'react';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import { ShortcutCardDefault } from './ShortcutCardDefault';
import { ShortcutCardCompact } from './ShortcutCardCompact';
import { type ShortcutCardVariant } from './shortcutCardVariant';

interface ShortcutCardRendererProps {
  variant: ShortcutCardVariant;
  compactShowTitle: boolean;
  shortcut: Shortcut;
  compactIconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  compactTitleFontSize?: number;
  defaultIconSize?: number;
  defaultTitleFontSize?: number;
  defaultUrlFontSize?: number;
  defaultVerticalPadding?: number;
  forceTextWhite?: boolean;
  enableLargeFolder?: boolean;
  largeFolderPreviewSize?: number;
  onPreviewShortcutOpen?: (shortcut: Shortcut) => void;
  selectionDisabled?: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function ShortcutCardRenderer({
  variant,
  compactShowTitle,
  shortcut,
  compactIconSize,
  iconCornerRadius,
  iconAppearance,
  compactTitleFontSize,
  defaultIconSize,
  defaultTitleFontSize,
  defaultUrlFontSize,
  defaultVerticalPadding,
  forceTextWhite = false,
  enableLargeFolder = false,
  largeFolderPreviewSize,
  onPreviewShortcutOpen,
  selectionDisabled = false,
  onOpen,
  onContextMenu,
}: ShortcutCardRendererProps) {
  switch (variant) {
    case 'compact':
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
    case 'default':
    default:
      return (
        <ShortcutCardDefault
          shortcut={shortcut}
          iconSize={defaultIconSize}
          iconCornerRadius={iconCornerRadius}
          iconAppearance={iconAppearance}
          titleFontSize={defaultTitleFontSize}
          urlFontSize={defaultUrlFontSize}
          verticalPadding={defaultVerticalPadding}
          forceTextWhite={forceTextWhite}
          selectionDisabled={selectionDisabled}
          onOpen={onOpen}
          onContextMenu={onContextMenu}
        />
      );
  }
}
