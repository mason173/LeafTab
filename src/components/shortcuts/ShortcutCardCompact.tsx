import React from 'react';
import { Shortcut } from '@/types';
import ShortcutIcon from '@/components/ShortcutIcon';

interface ShortcutCardCompactProps {
  shortcut: Shortcut;
  showTitle: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function ShortcutCardCompact({ shortcut, showTitle, onOpen, onContextMenu }: ShortcutCardCompactProps) {
  return (
    <div
      className="relative rounded-xl w-[72px] cursor-pointer select-none group/shortcut"
      onClick={onOpen}
      onContextMenu={onContextMenu}
    >
      <div className={`flex w-[72px] flex-col items-center justify-start gap-[4px] ${showTitle ? 'h-[96px]' : 'h-[72px]'}`}>
        <div className="h-[72px] w-[72px] shrink-0 transform-gpu origin-center transition-transform duration-150 ease-out will-change-transform group-hover/shortcut:scale-[1.05]">
          <ShortcutIcon
            icon={shortcut.icon}
            url={shortcut.url}
            size={72}
            exact
            frame="never"
            fallbackStyle="emptyicon"
            fallbackLabel={shortcut.title}
          />
        </div>
        {showTitle ? (
          <p className="w-[72px] truncate text-center text-[12px] leading-4 text-foreground">
            {shortcut.title}
          </p>
        ) : null}
      </div>
    </div>
  );
}
