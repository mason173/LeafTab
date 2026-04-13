import React, { useEffect, useRef, useState } from 'react';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import ShortcutIcon from '@/components/ShortcutIcon';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import { LIGHT_FOLDER_SURFACE_CLASSNAME, ShortcutFolderInlinePreview } from './ShortcutFolderPreview';
import { isShortcutFolder } from '@/utils/shortcutFolders';

interface ShortcutCardDefaultProps {
  shortcut: Shortcut;
  iconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  titleFontSize?: number;
  urlFontSize?: number;
  verticalPadding?: number;
  forceTextWhite?: boolean;
  selectionDisabled?: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

function ScrollingText({
  text,
  containerClassName,
  textClassName,
  textStyle,
  allowScroll = true,
}: {
  text: string;
  containerClassName?: string;
  textClassName?: string;
  textStyle?: React.CSSProperties;
  allowScroll?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflow, setIsOverflow] = useState(false);
  const [scrollDistance, setScrollDistance] = useState(0);

  useEffect(() => {
    if (!allowScroll) {
      setIsOverflow(false);
      setScrollDistance(0);
      return;
    }

    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const distance = textRef.current.scrollWidth - containerRef.current.offsetWidth;
        setIsOverflow(distance > 0);
        setScrollDistance(distance > 0 ? distance : 0);
      }
    };

    checkOverflow();
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(checkOverflow);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [allowScroll, text]);

  const duration = Math.max(2, scrollDistance / 50);

  return (
    <div ref={containerRef} className={`relative overflow-hidden w-full shrink-0 select-none ${containerClassName || ''}`}>
      <p ref={textRef} className={`absolute opacity-0 pointer-events-none whitespace-nowrap ${textClassName || ''}`} style={textStyle}>{text}</p>

      {!allowScroll || !isOverflow ? (
        <p className={`whitespace-nowrap truncate w-full ${textClassName || ''}`} style={textStyle}>{text}</p>
      ) : (
        <>
          <p className={`whitespace-nowrap truncate w-full transition-opacity group-hover/shortcut:opacity-0 ${textClassName || ''}`} style={textStyle}>{text}</p>
          <p
            className={`whitespace-nowrap w-max absolute inset-0 opacity-0 group-hover/shortcut:opacity-100 transition-opacity [animation-play-state:paused] group-hover/shortcut:[animation-play-state:running] ${textClassName || ''}`}
            style={{
              animation: `scroll-text ${duration}s linear infinite`,
              '--scroll-distance': `-${scrollDistance}px`,
              ...textStyle,
            } as React.CSSProperties}
          >
            {text}
          </p>
        </>
      )}
    </div>
  );
}

export function ShortcutCardDefault({
  shortcut,
  iconSize = 36,
  iconCornerRadius,
  iconAppearance,
  titleFontSize = 14,
  urlFontSize = 10,
  verticalPadding = 8,
  forceTextWhite = false,
  selectionDisabled = false,
  onOpen,
  onContextMenu,
}: ShortcutCardDefaultProps) {
  const firefox = isFirefoxBuildTarget();
  const folder = isShortcutFolder(shortcut);
  const folderSelectionDisabled = selectionDisabled && folder;
  const secondaryText = shortcut.url;

  if (folder) {
    const previewIconSize = Math.max(18, Math.round(iconSize * 0.66));

    return (
      <div
        className={`relative w-full select-none rounded-xl ${
          folderSelectionDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
        } ${
          firefox ? '' : 'transition-[background-color,border-color,box-shadow] duration-150'
        } border ${LIGHT_FOLDER_SURFACE_CLASSNAME} ${
          folderSelectionDisabled ? '' : 'hover:bg-[rgba(212,219,226,0.48)] dark:hover:bg-black/32'
        } dark:border-white/10 dark:bg-black/26 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`}
        onClick={onOpen}
        onContextMenu={onContextMenu}
      >
        <div
          className="flex w-full items-center"
          style={{ padding: `${verticalPadding}px 10px` }}
        >
          <ShortcutFolderInlinePreview
            shortcut={shortcut}
            iconSize={previewIconSize}
            iconCornerRadius={iconCornerRadius}
            iconAppearance={iconAppearance}
            maxIcons={4}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl shrink-0 w-full cursor-pointer select-none group/shortcut ${
        firefox ? 'hover:bg-accent/25' : 'transition-[background-color] hover:bg-accent/40'
      }`}
      onClick={onOpen}
      onContextMenu={onContextMenu}
    >
      <div className="flex flex-row items-center size-full">
        <div
          className="content-stretch flex gap-[8px] items-center px-[8px] relative w-full"
          style={{ paddingTop: verticalPadding, paddingBottom: verticalPadding }}
        >
          <div className="relative shrink-0" style={{ width: iconSize, height: iconSize }}>
            <ShortcutIcon
              icon={shortcut.icon}
              url={shortcut.url}
              shortcutId={shortcut.id}
              size={iconSize}
              frame="auto"
              fallbackStyle="emptyicon"
              fallbackLabel={shortcut.title}
              fallbackLetterSize={16}
              useOfficialIcon={shortcut.useOfficialIcon}
              autoUseOfficialIcon={shortcut.autoUseOfficialIcon}
              officialIconAvailableAtSave={shortcut.officialIconAvailableAtSave}
              officialIconColorOverride={shortcut.officialIconColorOverride}
              iconRendering={shortcut.iconRendering}
              iconColor={shortcut.iconColor}
              iconCornerRadius={iconCornerRadius}
              iconAppearance={iconAppearance}
            />
          </div>
          <div className="content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start justify-center leading-none min-h-px min-w-px not-italic relative">
            <ScrollingText
              text={shortcut.title}
              textClassName={`font-['PingFang_SC:Medium',sans-serif] ${forceTextWhite ? 'text-white' : 'text-foreground'}`}
              textStyle={{ fontSize: titleFontSize }}
              allowScroll={!firefox}
            />
            <ScrollingText
              text={secondaryText}
              textClassName={`font-['PingFang_SC:Regular',sans-serif] leading-[14px] ${forceTextWhite ? 'text-white' : 'text-muted-foreground'}`}
              textStyle={{ fontSize: urlFontSize }}
              allowScroll={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
