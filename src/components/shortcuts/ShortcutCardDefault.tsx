import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Shortcut } from '@/types';
import ShortcutIcon from '@/components/ShortcutIcon';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';

interface ShortcutCardDefaultProps {
  shortcut: Shortcut;
  iconSize?: number;
  titleFontSize?: number;
  urlFontSize?: number;
  verticalPadding?: number;
  forceTextWhite?: boolean;
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
  titleFontSize = 14,
  urlFontSize = 10,
  verticalPadding = 8,
  forceTextWhite = false,
  onOpen,
  onContextMenu,
}: ShortcutCardDefaultProps) {
  const firefox = isFirefoxBuildTarget();

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
          <ShortcutIcon
            icon={shortcut.icon}
            url={shortcut.url}
            size={iconSize}
            frame="auto"
            fallbackStyle="emptyicon"
            fallbackLabel={shortcut.title}
            fallbackLetterSize={16}
          />
          <div className="content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start justify-center leading-none min-h-px min-w-px not-italic relative">
            <ScrollingText
              text={shortcut.title}
              textClassName={`font-['PingFang_SC:Medium',sans-serif] ${forceTextWhite ? 'text-white' : 'text-foreground'}`}
              textStyle={{ fontSize: titleFontSize }}
              allowScroll={!firefox}
            />
            <ScrollingText
              text={shortcut.url}
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
