import React, { useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Shortcut } from '../types';
import { ShortcutGrid } from './ShortcutGrid';
import {
  getShortcutColumns,
  type ShortcutCardVariant,
  type ShortcutLayoutDensity,
} from './shortcuts/shortcutCardVariant';

interface ShortcutsCarouselProps {
  currentIndex: number;
  onIndexChange: (index: number) => void;
  pageIndices: number[];
  height: number;
  shortcuts: Shortcut[];
  rowsPerColumn: number;
  cardVariant: ShortcutCardVariant;
  layoutDensity?: ShortcutLayoutDensity;
  compactIconSize?: number;
  compactTitleFontSize?: number;
  defaultIconSize?: number;
  defaultTitleFontSize?: number;
  defaultUrlFontSize?: number;
  defaultVerticalPadding?: number;
  forceTextWhite?: boolean;
  compactShowTitle: boolean;
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
  cardVariant,
  layoutDensity = 'regular',
  compactIconSize = 72,
  compactTitleFontSize = 12,
  defaultIconSize = 36,
  defaultTitleFontSize = 14,
  defaultUrlFontSize = 10,
  defaultVerticalPadding = 8,
  forceTextWhite = false,
  compactShowTitle,
  onShortcutOpen,
  onShortcutContextMenu,
  onPageReorder,
  onPageContextMenu
}: ShortcutsCarouselProps) {
  const columns = getShortcutColumns(cardVariant, layoutDensity);
  const [isDraggingGrid, setIsDraggingGrid] = React.useState(false);
  const isDraggingGridRef = React.useRef(false);
  useEffect(() => {
    isDraggingGridRef.current = isDraggingGrid;
  }, [isDraggingGrid]);

  const emblaOptions = React.useMemo(() => ({
    axis: 'x' as const,
    align: 'start' as const,
    dragFree: false,
    containScroll: 'trimSnaps' as const,
    watchDrag: (_api: any, event: MouseEvent | TouchEvent) => {
      if (isDraggingGridRef.current) return false;
      const target = event.target as HTMLElement | null;
      if (!target) return true;
      return !target.closest('[data-shortcut-drag-item="true"]');
    },
  }), []);

  const [emblaRef, embla] = useEmblaCarousel(emblaOptions);
  const wheelTargetRef = React.useRef<HTMLDivElement | null>(null);
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

  const scrollTo = useCallback((index: number) => {
    if (!embla) return;
    embla.scrollTo(index);
  }, [embla]);

  const handleWheel = useCallback((e: WheelEvent) => {
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

  useEffect(() => {
    const node = wheelTargetRef.current;
    if (!node) return;
    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel as any);
  }, [handleWheel]);

  return (
    <div className="relative w-full">
      <div
        className="overflow-hidden"
        ref={(node) => {
          wheelTargetRef.current = node;
          emblaRef(node);
        }}
        style={{ minHeight: height }}
      >
        <div className="flex">
          {pageIndices.map((p) => {
            const pageCapacity = rowsPerColumn * columns;
            const start = p * pageCapacity;
            const end = Math.min(start + pageCapacity, shortcuts.length);
            const pageShortcuts = shortcuts.slice(start, end);
            return (
            <div key={p} className="shrink-0 w-full">
              <ShortcutGrid
                pageIndex={p}
                containerHeight={height}
                pageShortcuts={pageShortcuts}
                pageStartIndex={start}
                cardVariant={cardVariant}
                layoutDensity={layoutDensity}
                compactIconSize={compactIconSize}
                compactTitleFontSize={compactTitleFontSize}
                defaultIconSize={defaultIconSize}
                defaultTitleFontSize={defaultTitleFontSize}
                defaultUrlFontSize={defaultUrlFontSize}
                defaultVerticalPadding={defaultVerticalPadding}
                forceTextWhite={forceTextWhite}
                compactShowTitle={compactShowTitle}
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
