import React from 'react';
import { Shortcut } from '@/types';
import { ShortcutCardDefault } from './ShortcutCardDefault';
import { ShortcutCardCompact } from './ShortcutCardCompact';
import { type ShortcutCardVariant } from './shortcutCardVariant';

interface ShortcutCardRendererProps {
  variant: ShortcutCardVariant;
  compactShowTitle: boolean;
  shortcut: Shortcut;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function ShortcutCardRenderer({ variant, compactShowTitle, shortcut, onOpen, onContextMenu }: ShortcutCardRendererProps) {
  switch (variant) {
    case 'compact':
      return (
        <ShortcutCardCompact
          shortcut={shortcut}
          showTitle={compactShowTitle}
          onOpen={onOpen}
          onContextMenu={onContextMenu}
        />
      );
    case 'default':
    default:
      return <ShortcutCardDefault shortcut={shortcut} onOpen={onOpen} onContextMenu={onContextMenu} />;
  }
}
