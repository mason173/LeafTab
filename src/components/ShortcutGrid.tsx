import React, { useRef, useState, useEffect, useMemo } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Shortcut } from '../types';
import { ShortcutCardRenderer } from './shortcuts/ShortcutCardRenderer';
import { DEFAULT_SHORTCUT_CARD_VARIANT, ShortcutCardVariant, getShortcutColumns } from './shortcuts/shortcutCardVariant';

function SortableShortcut({
  sortId,
  cardVariant,
  compactShowTitle,
  shortcut,
  onOpen,
  onContextMenu,
}: {
  sortId: string;
  cardVariant: ShortcutCardVariant;
  compactShowTitle: boolean;
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
      className={`${cardVariant === 'compact' ? 'w-[72px]' : 'w-full'} will-change-transform`}
      data-shortcut-drag-item="true"
    >
      <ShortcutCardRenderer
        variant={cardVariant}
        compactShowTitle={compactShowTitle}
        shortcut={shortcut}
        onOpen={onOpen}
        onContextMenu={onContextMenu}
      />
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
  cardVariant?: ShortcutCardVariant;
  compactShowTitle?: boolean;
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
  cardVariant = DEFAULT_SHORTCUT_CARD_VARIANT,
  compactShowTitle = true,
  onDragStart,
  onDragEnd,
}: ShortcutGridProps) {
  const columns = getShortcutColumns(cardVariant);
  const rowGap = cardVariant === 'compact' ? 20 : 4;
  const compactLayout = cardVariant === 'compact';
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
      className="relative w-full" 
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
            className="grid"
            style={{
              gridTemplateColumns: compactLayout
                ? `repeat(${columns}, 72px)`
                : `repeat(${columns}, minmax(0, 1fr))`,
              columnGap: compactLayout ? undefined : '4px',
              justifyContent: compactLayout ? 'space-between' : undefined,
              rowGap: `${rowGap}px`,
              touchAction: 'pan-y',
            }}
          >
            {items.map((item) => (
              <SortableShortcut 
                key={item.sortId}
                sortId={item.sortId}
                cardVariant={cardVariant}
                compactShowTitle={compactShowTitle}
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
