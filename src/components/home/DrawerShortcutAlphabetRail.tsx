import { useCallback, useRef, useState } from 'react';

type DrawerShortcutAlphabetRailProps = {
  letters: string[];
  activeLetter: string | null;
  onLetterSelect: (letter: string) => void;
  className?: string;
};

export function DrawerShortcutAlphabetRail({
  letters,
  activeLetter,
  onLetterSelect,
  className,
}: DrawerShortcutAlphabetRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const draggingPointerIdRef = useRef<number | null>(null);
  const lastDraggedLetterRef = useRef<string | null>(null);
  const [pressing, setPressing] = useState(false);

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
      style={{ touchAction: 'none' }}
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
      <div className={`flex select-none flex-col items-center gap-1 rounded-[22px] bg-black/10 px-1.5 py-3 backdrop-blur-md ${pressing ? 'bg-black/16' : ''}`}>
        {letters.map((letter) => {
          const selected = activeLetter === letter;

          return (
            <button
              key={letter}
              type="button"
              data-shortcut-index-letter={letter}
              aria-label={letter === '#' ? '显示全部快捷方式' : `筛选 ${letter} 开头的快捷方式`}
              className="relative flex h-[18px] w-9 items-center justify-center bg-transparent text-center outline-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              onClick={() => {
                onLetterSelect(letter);
              }}
            >
              <span
                className={`absolute inset-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center font-semibold transition-all ${
                  selected
                    ? 'h-[30px] w-[30px] rounded-full bg-white/90 text-[12px] text-black shadow-[0_8px_22px_rgba(15,23,42,0.24)]'
                    : 'h-auto w-auto text-[10px] text-white/82'
                }`}
                style={{ lineHeight: selected ? '30px' : '10px' }}
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
