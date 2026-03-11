import React from 'react';
import { Shortcut } from '@/types';
import { ShortcutCardDefault } from './ShortcutCardDefault';
import { ShortcutCardCompact } from './ShortcutCardCompact';
import { type ShortcutCardVariant } from './shortcutCardVariant';

interface ShortcutCardRendererProps {
  variant: ShortcutCardVariant;
  compactShowTitle: boolean;
  shortcut: Shortcut;
  compactIconSize?: number;
  compactTitleFontSize?: number;
  defaultIconSize?: number;
  defaultTitleFontSize?: number;
  defaultUrlFontSize?: number;
  defaultVerticalPadding?: number;
  forceTextWhite?: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function ShortcutCardRenderer({
  variant,
  compactShowTitle,
  shortcut,
  compactIconSize,
  compactTitleFontSize,
  defaultIconSize,
  defaultTitleFontSize,
  defaultUrlFontSize,
  defaultVerticalPadding,
  forceTextWhite = false,
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
          titleFontSize={compactTitleFontSize}
          forceTextWhite={forceTextWhite}
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
          titleFontSize={defaultTitleFontSize}
          urlFontSize={defaultUrlFontSize}
          verticalPadding={defaultVerticalPadding}
          forceTextWhite={forceTextWhite}
          onOpen={onOpen}
          onContextMenu={onContextMenu}
        />
      );
  }
}
