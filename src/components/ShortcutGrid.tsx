import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Shortcut } from '../types';
import ShortcutIcon from './ShortcutIcon';

// 滚动文本组件
function ScrollingText({ text, containerClassName, textClassName, allowScroll = true }: { text: string; containerClassName?: string; textClassName?: string; allowScroll?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflow, setIsOverflow] = useState(false);
  const [scrollDistance, setScrollDistance] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const distance = textRef.current.scrollWidth - containerRef.current.offsetWidth;
        setIsOverflow(distance > 0);
        setScrollDistance(distance > 0 ? distance : 0);
      }
    };
    
    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    if (containerRef.current) observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, [text]);

  const duration = Math.max(2, scrollDistance / 50);

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden w-full shrink-0 select-none ${containerClassName || ''}`}
    >
      <p ref={textRef} className={`absolute opacity-0 pointer-events-none whitespace-nowrap ${textClassName || ''}`}>{text}</p>

      {!allowScroll || !isOverflow ? (
        <p className={`whitespace-nowrap truncate w-full ${textClassName || ''}`}>{text}</p>
      ) : (
        <>
          <p className={`whitespace-nowrap truncate w-full transition-opacity group-hover/shortcut:opacity-0 ${textClassName || ''}`}>{text}</p>
          <p
            className={`whitespace-nowrap w-max absolute inset-0 opacity-0 group-hover/shortcut:opacity-100 transition-opacity [animation-play-state:paused] group-hover/shortcut:[animation-play-state:running] ${textClassName || ''}`}
            style={{ 
              animation: `scroll-text ${duration}s linear infinite`,
              '--scroll-distance': `-${scrollDistance}px`
            } as React.CSSProperties}
          >
            {text}
          </p>
        </>
      )}
    </div>
  );
}

// 通用的快捷方式项组件
function ShortcutItem({ shortcut, onOpen, onContextMenu }: { shortcut: Shortcut; onOpen: () => void; onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void }) {
  return (
    <div 
      className="relative rounded-xl shrink-0 w-full cursor-pointer transition-[background-color] select-none group/shortcut hover:bg-accent/40"
      onClick={onOpen}
      onContextMenu={onContextMenu}
    >
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[8px] items-center px-[8px] py-[12px] relative w-full">
          <ShortcutIcon icon={shortcut.icon} url={shortcut.url} size={36} frame="auto" />
          <div className="content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start justify-center leading-none min-h-px min-w-px not-italic relative">
            <ScrollingText 
              text={shortcut.title} 
              textClassName="font-['PingFang_SC:Medium',sans-serif] text-foreground text-[14px]"
            />
            <ScrollingText 
              text={shortcut.url} 
              textClassName="font-['PingFang_SC:Regular',sans-serif] text-muted-foreground text-[10px] leading-[14px]"
              allowScroll={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 拖拽排序项
function SortableShortcut({
  sortId,
  shortcut,
  onOpen,
  onContextMenu,
}: {
  sortId: string;
  shortcut: Shortcut;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortId });
  const style = {
    transform: CSS.Transform.toString(transform),
    // Keep slot-shift animation for other cards; only the actively dragged card skips transition.
    transition: isDragging ? undefined : transition,
  } as React.CSSProperties;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="w-full will-change-transform"
      data-shortcut-drag-item="true"
    >
      <ShortcutItem shortcut={shortcut} onOpen={onOpen} onContextMenu={onContextMenu} />
    </div>
  );
}

 

interface ShortcutGridProps {
  pageIndex: number;
  containerHeight: number;
  pageShortcuts: Shortcut[];
  pageStartIndex: number;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu: (event: React.MouseEvent<HTMLDivElement>, shortcutIndex: number, shortcut: Shortcut) => void;
  onPageReorder: (pageIndex: number, nextShortcuts: Shortcut[]) => void;
  onPageContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function ShortcutGrid({ 
  pageIndex,
  containerHeight,
  pageShortcuts,
  pageStartIndex,
  onShortcutOpen,
  onShortcutContextMenu,
  onPageReorder,
  onPageContextMenu,
  onDragStart,
  onDragEnd,
}: ShortcutGridProps) {
  const items = useMemo(() => {
    return pageShortcuts.map((shortcut, index) => {
      const shortcutIndex = pageStartIndex + index;
      const sortId = `${shortcut.id || 'shortcut'}::${shortcutIndex}`;
      return { sortId, shortcut, shortcutIndex };
    });
  }, [pageShortcuts, pageStartIndex]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [dragging, setDragging] = useState(false);
  const ignoreClickRef = useRef(false);

  useEffect(() => {
    if (dragging) {
      ignoreClickRef.current = true;
      onDragStart?.();
    } else {
      window.setTimeout(() => {
        ignoreClickRef.current = false;
      }, 120);
      onDragEnd?.();
    }
  }, [dragging, onDragStart, onDragEnd]);

  return (
    <div 
      className="relative w-[803px]" 
      style={{ minHeight: containerHeight }} 
      onContextMenu={onPageContextMenu}
    >
      <DndContext 
        sensors={sensors}
        onDragStart={() => setDragging(true)}
        onDragEnd={({ active, over }) => {
          setDragging(false);
          if (!active || !over || active.id === over.id) return;
          const oldIndex = items.findIndex(i => i.sortId === String(active.id));
          const newIndex = items.findIndex(i => i.sortId === String(over.id));
          if (oldIndex < 0 || newIndex < 0) return;
          const next = arrayMove(items, oldIndex, newIndex);
          onPageReorder(pageIndex, next.map((item) => item.shortcut));
        }}
      >
        <SortableContext items={items.map(i => i.sortId)} strategy={rectSortingStrategy}>
          <div 
            className="grid gap-[4px]" 
            style={{ gridTemplateColumns: 'repeat(3, 265px)', touchAction: 'pan-y' }}
          >
            {items.map((item) => (
              <SortableShortcut 
                key={item.sortId}
                sortId={item.sortId}
                shortcut={item.shortcut}
                onOpen={() => { if (!ignoreClickRef.current) onShortcutOpen(item.shortcut); }}
                onContextMenu={(event) => { if (!ignoreClickRef.current) onShortcutContextMenu(event, item.shortcutIndex, item.shortcut); }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
