import { useCallback, useRef, useState, type CSSProperties } from 'react';

type DrawerShortcutAlphabetRailProps = {
  letters: string[];
  activeLetter: string | null;
  onLetterSelect: (letter: string) => void;
  className?: string;
  style?: CSSProperties;
};

export function DrawerShortcutAlphabetRail({
  letters,
  activeLetter,
  onLetterSelect,
  className,
  style,
}: DrawerShortcutAlphabetRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const draggingPointerIdRef = useRef<number | null>(null);
  const lastDraggedLetterRef = useRef<string | null>(null);
  const [pressing, setPressing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const compactMode = letters.length >= 18;
  const denseMode = letters.length >= 24;
  const buttonHeightClassName = denseMode ? 'h-[15px]' : compactMode ? 'h-4' : 'h-[18px]';
  const railGapClassName = denseMode ? 'gap-0.5' : compactMode ? 'gap-[3px]' : 'gap-1';
  const expandedRailWidthPx = denseMode ? 44 : 48;
  const collapsedRailWidthPx = denseMode ? 28 : compactMode ? 30 : 32;
  const expanded = pressing || hovered || focusWithin;
  const railWidthPx = expanded ? expandedRailWidthPx : collapsedRailWidthPx;
  const railTranslateXPx = expanded ? (expandedRailWidthPx - collapsedRailWidthPx) / 2 : 0;
  const railPaddingXClassName = expanded ? 'px-1.5' : 'px-1';
  const selectedBubbleClassName = expanded
    ? (denseMode
        ? 'h-[24px] w-[24px] text-[10px]'
        : compactMode
          ? 'h-[26px] w-[26px] text-[11px]'
          : 'h-[30px] w-[30px] text-[12px]')
    : (denseMode
        ? 'h-[18px] w-[18px] text-[9px]'
        : compactMode
          ? 'h-[20px] w-[20px] text-[9px]'
          : 'h-[22px] w-[22px] text-[10px]');
  const idleTextClassName = expanded
    ? (denseMode
        ? 'text-[8px]'
        : compactMode
          ? 'text-[9px]'
          : 'text-[10px]')
    : (denseMode
        ? 'text-[7px]'
        : compactMode
          ? 'text-[8px]'
          : 'text-[9px]');

  const selectLetterFromClientY = useCallback((clientY: number) => {
    const railElement = railRef.current;
    if (!railElement) return;

    const letterElements = railElement.querySelectorAll<HTMLElement>('[data-shortcut-index-letter]');
    let nearestLetter: string | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    letterElements.forEach((element) => {
      const elementLetter = element.dataset.shortcutIndexLetter;
      if (!elementLetter) return;

      const rect = element.getBoundingClientRect();
      const centerY = rect.top + (rect.height / 2);
      const distance = Math.abs(clientY - centerY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestLetter = elementLetter;
      }
    });

    if (!nearestLetter || lastDraggedLetterRef.current === nearestLetter) return;
    lastDraggedLetterRef.current = nearestLetter;
    onLetterSelect(nearestLetter);
  }, [onLetterSelect]);

  const releaseDragging = useCallback((pointerId?: number) => {
    const railElement = railRef.current;
    if (
      railElement
      && typeof pointerId === 'number'
      && railElement.hasPointerCapture(pointerId)
    ) {
      railElement.releasePointerCapture(pointerId);
    }

    draggingPointerIdRef.current = null;
    lastDraggedLetterRef.current = null;
    setPressing(false);
  }, []);

  if (letters.length === 0) return null;

  return (
    <div
      ref={railRef}
      className={className}
      aria-label="快捷方式字母索引"
      style={{ touchAction: 'none', ...style }}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'mouse') return;
        setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'mouse') return;
        setHovered(false);
      }}
      onFocusCapture={() => {
        setFocusWithin(true);
      }}
      onBlurCapture={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setFocusWithin(false);
      }}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        draggingPointerIdRef.current = event.pointerId;
        lastDraggedLetterRef.current = null;
        setPressing(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        selectLetterFromClientY(event.clientY);
      }}
      onPointerMove={(event) => {
        if (draggingPointerIdRef.current !== event.pointerId) return;
        selectLetterFromClientY(event.clientY);
      }}
      onPointerUp={(event) => {
        if (draggingPointerIdRef.current !== event.pointerId) return;
        releaseDragging(event.pointerId);
      }}
      onPointerCancel={(event) => {
        if (draggingPointerIdRef.current !== event.pointerId) return;
        releaseDragging(event.pointerId);
      }}
    >
      <div
        className={`no-scrollbar flex max-h-[calc(100%-20px)] select-none flex-col items-center overflow-y-auto rounded-[22px] bg-black/10 py-3 backdrop-blur-md transition-[width,transform,padding,background-color,box-shadow] duration-180 ease-out ${railGapClassName} ${railPaddingXClassName} ${pressing ? 'bg-black/16 shadow-[0_10px_28px_rgba(15,23,42,0.16)]' : ''}`}
        style={{
          width: `${railWidthPx}px`,
          transform: `translate3d(${railTranslateXPx}px, 0, 0)`,
        }}
      >
        {letters.map((letter) => {
          const selected = activeLetter === letter;

          return (
            <button
              key={letter}
              type="button"
              data-shortcut-index-letter={letter}
              aria-label={letter === '#' ? '筛选非字母开头的快捷方式' : `筛选 ${letter} 开头的快捷方式`}
              aria-pressed={selected}
              className={`relative flex ${buttonHeightClassName} w-full items-center justify-center bg-transparent text-center outline-none`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              onClick={() => {
                onLetterSelect(letter);
              }}
            >
              <span
                className={`absolute inset-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center font-semibold transition-all duration-180 ease-out ${
                  selected
                    ? `rounded-full bg-white/90 text-black shadow-[0_8px_22px_rgba(15,23,42,0.24)] ${selectedBubbleClassName}`
                    : `h-auto w-auto text-white/82 ${idleTextClassName}`
                }`}
                style={{ lineHeight: selected ? undefined : '1' }}
              >
                {letter}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
