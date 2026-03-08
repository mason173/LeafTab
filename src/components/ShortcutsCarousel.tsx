import React, { useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Shortcut } from '../types';
import { ShortcutGrid } from './ShortcutGrid';

interface ShortcutsCarouselProps {
  currentIndex: number;
  onIndexChange: (index: number) => void;
  pageIndices: number[];
  height: number;
  shortcuts: Shortcut[];
  rowsPerColumn: number;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu: (event: React.MouseEvent<HTMLDivElement>, shortcutIndex: number, shortcut: Shortcut) => void;
  onPageReorder: (pageIndex: number, nextShortcuts: Shortcut[]) => void;
  onPageContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function ShortcutsCarousel({
  currentIndex,
  onIndexChange,
  pageIndices,
  height,
  shortcuts,
  rowsPerColumn,
  onShortcutOpen,
  onShortcutContextMenu,
  onPageReorder,
  onPageContextMenu
}: ShortcutsCarouselProps) {
  const [isDraggingGrid, setIsDraggingGrid] = React.useState(false);
  const [emblaRef, embla] = useEmblaCarousel({ axis: 'x', align: 'start', dragFree: false, containScroll: 'trimSnaps' });
  const wheelAccRef = React.useRef(0);
  const lastWheelAtRef = React.useRef(0);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => {
      const idx = embla.selectedScrollSnap();
      onIndexChange(idx);
    };
    embla.on('select', onSelect);
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla, onIndexChange]);

  useEffect(() => {
    if (!embla) return;
    const maxIndex = Math.max(0, pageIndices.length - 1);
    embla.scrollTo(Math.min(currentIndex, maxIndex), false);
  }, [embla, currentIndex, pageIndices.length]);

  useEffect(() => {
    if (!embla) return;
    embla.reInit({ axis: 'x', align: 'start', dragFree: false, containScroll: 'trimSnaps' });
  }, [isDraggingGrid, embla]);

  const scrollTo = useCallback((index: number) => {
    if (!embla) return;
    embla.scrollTo(index);
  }, [embla]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!embla || isDraggingGrid) return;
    const now = Date.now();
    if (now - lastWheelAtRef.current < 160) {
      e.preventDefault();
      return;
    }
    wheelAccRef.current += e.deltaY;
    const threshold = 30;
    if (wheelAccRef.current > threshold) {
      if (embla.canScrollNext()) embla.scrollNext();
      wheelAccRef.current = 0;
      lastWheelAtRef.current = now;
      e.preventDefault();
    } else if (wheelAccRef.current < -threshold) {
      if (embla.canScrollPrev()) embla.scrollPrev();
      wheelAccRef.current = 0;
      lastWheelAtRef.current = now;
      e.preventDefault();
    }
  }, [embla, isDraggingGrid]);

  return (
    <div className="relative w-[803px]">
      <div className="overflow-hidden" ref={emblaRef} onWheel={handleWheel} style={{ minHeight: height, pointerEvents: isDraggingGrid ? 'none' : 'auto' }}>
        <div className="flex">
          {pageIndices.map((p) => {
            const pageCapacity = rowsPerColumn * 3;
            const start = p * pageCapacity;
            const end = Math.min(start + pageCapacity, shortcuts.length);
            const pageShortcuts = shortcuts.slice(start, end);
            return (
            <div key={p} className="shrink-0 w-[803px]">
              <ShortcutGrid
                pageIndex={p}
                containerHeight={height}
                pageShortcuts={pageShortcuts}
                pageStartIndex={start}
                onShortcutOpen={onShortcutOpen}
                onShortcutContextMenu={onShortcutContextMenu}
                onPageReorder={onPageReorder}
                onPageContextMenu={onPageContextMenu}
                onDragStart={() => setIsDraggingGrid(true)}
                onDragEnd={() => setIsDraggingGrid(false)}
              />
            </div>
          )})}
        </div>
      </div>
      {pageIndices.length > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {pageIndices.map((p, i) => (
            <button
              key={p}
              className={`w-[8px] h-[8px] rounded-full ${i === currentIndex ? 'bg-foreground' : 'bg-muted-foreground/40'} hover:bg-foreground transition-colors`}
              onClick={() => scrollTo(i)}
              aria-label={`Go to page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
