import React, { useMemo } from 'react';
import { Shortcut } from '@/types';
import ShortcutIcon from '@/components/ShortcutIcon';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';

interface ShortcutCardCompactProps {
  shortcut: Shortcut;
  showTitle: boolean;
  iconSize?: number;
  titleFontSize?: number;
  forceTextWhite?: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function ShortcutCardCompact({
  shortcut,
  showTitle,
  iconSize = 72,
  titleFontSize = 12,
  forceTextWhite = false,
  onOpen,
  onContextMenu,
}: ShortcutCardCompactProps) {
  const firefox = isFirefoxBuildTarget();
  const titleBlockHeight = 24;
  const totalHeight = iconSize + titleBlockHeight;
  return (
    <div
      className="relative rounded-xl cursor-pointer select-none group/shortcut"
      style={{ width: iconSize }}
      onClick={onOpen}
      onContextMenu={onContextMenu}
    >
      <div className="flex flex-col items-center justify-start gap-[4px]" style={{ width: iconSize, height: totalHeight }}>
        <div
          className={`shrink-0 origin-center ${firefox ? '' : 'transform-gpu transition-transform duration-150 ease-out will-change-transform group-hover/shortcut:scale-[1.05]'}`}
          style={{ height: iconSize, width: iconSize }}
        >
          <ShortcutIcon
            icon={shortcut.icon}
            url={shortcut.url}
            size={iconSize}
            exact
            frame="never"
            fallbackStyle="emptyicon"
            fallbackLabel={shortcut.title}
          />
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
