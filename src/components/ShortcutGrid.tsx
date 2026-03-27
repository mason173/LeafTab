import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { RiCheckFill } from '@/icons/ri-compat';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import { Shortcut } from '../types';
import { ShortcutCardRenderer } from './shortcuts/ShortcutCardRenderer';
import {
  DEFAULT_SHORTCUT_CARD_VARIANT,
  ShortcutCardVariant,
  type ShortcutLayoutDensity,
} from './shortcuts/shortcutCardVariant';

const DRAG_DROP_ANIMATION_MS = 320;
const DRAG_DROP_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const CARD_SETTLE_TRANSITION = 'transform 320ms cubic-bezier(0.2, 0.9, 0.2, 1.12)';
// Keep drag preview above the expanded drawer surface/overlay.
const DRAG_OVERLAY_Z_INDEX = 14030;
const DRAG_AUTO_SCROLL_EDGE_PX = 88;
const DRAG_AUTO_SCROLL_MAX_SPEED_PX = 26;

function DragPreviewIcon({
  shortcut,
  size,
}: {
  shortcut: Shortcut;
  size: number;
}) {
  const iconSrc = (shortcut.icon || '').trim();
  const label = (shortcut.title || shortcut.url || '?').trim();
  const fallbackText = (label.charAt(0) || '?').toUpperCase();

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt=""
        draggable={false}
        className="shrink-0 rounded-[20%] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-[20%] bg-primary/12 text-primary"
      style={{ width: size, height: size, fontSize: Math.max(14, Math.round(size * 0.38)), fontWeight: 600 }}
    >
      {fallbackText}
    </span>
  );
}

function LightweightDragPreview({
  shortcut,
  cardVariant,
  firefox,
  compactShowTitle,
  compactIconSize,
  compactTitleFontSize,
  defaultIconSize,
  defaultTitleFontSize,
  defaultUrlFontSize,
  defaultVerticalPadding,
  forceTextWhite,
}: {
  shortcut: Shortcut;
  cardVariant: ShortcutCardVariant;
  firefox: boolean;
  compactShowTitle: boolean;
  compactIconSize: number;
  compactTitleFontSize: number;
  defaultIconSize: number;
  defaultTitleFontSize: number;
  defaultUrlFontSize: number;
  defaultVerticalPadding: number;
  forceTextWhite: boolean;
}) {
  if (cardVariant === 'compact') {
    const titleVisible = compactShowTitle;
    return (
      <div
        className="pointer-events-none select-none"
        style={{
          width: compactIconSize,
          contain: 'layout paint style',
          willChange: firefox ? undefined : 'transform',
        }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <DragPreviewIcon shortcut={shortcut} size={compactIconSize} />
          {titleVisible ? (
            <p
              className={`truncate text-center leading-4 ${forceTextWhite ? 'text-white' : 'text-foreground'}`}
              style={{ width: compactIconSize, fontSize: compactTitleFontSize }}
            >
              {shortcut.title}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none select-none rounded-xl border border-border/40 bg-background/95 shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
      style={{
        width: 'min(280px, 72vw)',
        padding: `${defaultVerticalPadding}px 8px`,
        contain: 'layout paint style',
        willChange: firefox ? undefined : 'transform',
      }}
    >
      <div className="flex items-center gap-2">
        <DragPreviewIcon shortcut={shortcut} size={defaultIconSize} />
        <div className="min-w-0 flex-1 leading-none">
          <p
            className={`truncate font-['PingFang_SC:Medium',sans-serif] ${forceTextWhite ? 'text-white' : 'text-foreground'}`}
            style={{ fontSize: defaultTitleFontSize }}
          >
            {shortcut.title}
          </p>
          <p
            className={`truncate font-['PingFang_SC:Regular',sans-serif] ${forceTextWhite ? 'text-white/80' : 'text-muted-foreground'}`}
            style={{ fontSize: defaultUrlFontSize, marginTop: 3 }}
          >
            {shortcut.url}
          </p>
        </div>
      </div>
    </div>
  );
}

function findScrollableParent(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const canScroll = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
      && current.scrollHeight > current.clientHeight + 1;
    if (canScroll) return current;
    current = current.parentElement;
  }
  return null;
}

function SortableShortcut({
  sortId,
  activeDragId,
  cardVariant,
  gridColumns,
  compactShowTitle,
  compactIconSize,
  compactTitleFontSize,
  defaultIconSize,
  defaultTitleFontSize,
  defaultUrlFontSize,
  defaultVerticalPadding,
  forceTextWhite,
  shortcut,
  onOpen,
  onContextMenu,
  selected,
  selectionMode,
  dragDisabled,
  disableReorderAnimation,
  firefox,
}: {
  sortId: string;
  activeDragId: string | null;
  cardVariant: ShortcutCardVariant;
  gridColumns: number;
  compactShowTitle: boolean;
  compactIconSize: number;
  compactTitleFontSize: number;
  defaultIconSize: number;
  defaultTitleFontSize: number;
  defaultUrlFontSize: number;
  defaultVerticalPadding: number;
  forceTextWhite: boolean;
  shortcut: Shortcut;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  selected: boolean;
  selectionMode: boolean;
  dragDisabled: boolean;
  disableReorderAnimation: boolean;
  firefox: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortId,
    disabled: dragDisabled,
  });
  const isActiveDragItem = isDragging || activeDragId === sortId;
  const showDragPlaceholder = activeDragId === sortId;
  const compactPlaceholderHeight = compactIconSize + 24;
  const defaultPlaceholderHeight = defaultIconSize + defaultVerticalPadding * 2;
  const draggableProps = dragDisabled ? {} : { ...attributes, ...listeners };
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: disableReorderAnimation
      ? undefined
      : (isActiveDragItem ? undefined : (transition || CARD_SETTLE_TRANSITION)),
    willChange: !firefox && (isActiveDragItem || Boolean(transform)) ? 'transform' : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...draggableProps}
      className={`relative ${!firefox ? 'will-change-transform ' : ''}${cardVariant === 'compact' ? 'flex justify-center' : 'w-full'} ${
        selectionMode && !selected ? 'opacity-75' : ''
      }`}
      data-shortcut-grid-columns={gridColumns}
      data-shortcut-drag-item="true"
      data-testid={`shortcut-card-${sortId}`}
      data-shortcut-id={shortcut.id}
      data-shortcut-title={shortcut.title}
    >
      {showDragPlaceholder ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none rounded-xl border-2 border-dashed border-primary/45 bg-primary/10 ${
            cardVariant === 'compact' ? 'mx-auto' : 'w-full'
          }`}
          style={cardVariant === 'compact'
            ? { width: compactIconSize, height: compactPlaceholderHeight }
            : { height: defaultPlaceholderHeight }}
        />
      ) : (
        <ShortcutCardRenderer
          variant={cardVariant}
          compactShowTitle={compactShowTitle}
          compactIconSize={compactIconSize}
          compactTitleFontSize={compactTitleFontSize}
          defaultIconSize={defaultIconSize}
          defaultTitleFontSize={defaultTitleFontSize}
          defaultUrlFontSize={defaultUrlFontSize}
          defaultVerticalPadding={defaultVerticalPadding}
          forceTextWhite={forceTextWhite}
          shortcut={shortcut}
          onOpen={onOpen}
          onContextMenu={onContextMenu}
        />
      )}
      {selectionMode ? (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          aria-hidden="true"
        >
          {selected ? (
            <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <RiCheckFill className="size-3.5" />
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
interface ShortcutGridProps {
  containerHeight: number;
  bottomInset?: number;
  shortcuts: Shortcut[];
  gridColumns: number;
  minRows: number;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu: (event: React.MouseEvent<HTMLDivElement>, shortcutIndex: number, shortcut: Shortcut) => void;
  onShortcutReorder: (nextShortcuts: Shortcut[]) => void;
  onGridContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  cardVariant?: ShortcutCardVariant;
  compactShowTitle?: boolean;
  layoutDensity?: ShortcutLayoutDensity;
  compactIconSize?: number;
  compactTitleFontSize?: number;
  defaultIconSize?: number;
  defaultTitleFontSize?: number;
  defaultUrlFontSize?: number;
  defaultVerticalPadding?: number;
  forceTextWhite?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disableReorderAnimation?: boolean;
  selectionMode?: boolean;
  selectedShortcutIndexes?: ReadonlySet<number>;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
}

export const ShortcutGrid = React.memo(function ShortcutGrid({ 
  containerHeight,
  bottomInset = 0,
  shortcuts,
  gridColumns,
  minRows,
  onShortcutOpen,
  onShortcutContextMenu,
  onShortcutReorder,
  onGridContextMenu,
  cardVariant = DEFAULT_SHORTCUT_CARD_VARIANT,
  compactShowTitle = true,
  layoutDensity = 'regular',
  compactIconSize = 72,
  compactTitleFontSize = 12,
  defaultIconSize = 36,
  defaultTitleFontSize = 14,
  defaultUrlFontSize = 10,
  defaultVerticalPadding = 8,
  forceTextWhite = false,
  onDragStart,
  onDragEnd,
  disableReorderAnimation = false,
  selectionMode = false,
  selectedShortcutIndexes,
  onToggleShortcutSelection,
}: ShortcutGridProps) {
  const firefox = isFirefoxBuildTarget();
  const compactLayout = cardVariant === 'compact';
  const rowGap = cardVariant === 'compact'
    ? (layoutDensity === 'compact' ? 16 : layoutDensity === 'large' ? 24 : 20)
    : 8;
  const items = useMemo(() => {
    const used = new Map<string, number>();
    return shortcuts.map((shortcut, index) => {
      const shortcutIndex = index;
      const baseId = (shortcut.id || `${shortcut.url}::${shortcut.title}` || `shortcut-${shortcutIndex}`).trim();
      const duplicateCount = used.get(baseId) ?? 0;
      used.set(baseId, duplicateCount + 1);
      const sortId = duplicateCount === 0 ? baseId : `${baseId}::dup-${duplicateCount}`;
      return { sortId, shortcut, shortcutIndex };
    });
  }, [shortcuts]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [dragging, setDragging] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const clearOverlayTimerRef = useRef<number | null>(null);
  const ignoreClickRef = useRef(false);
  const autoScrollContainerRef = useRef<HTMLElement | null>(null);
  const autoScrollBoundsRef = useRef<{ top: number; bottom: number } | null>(null);
  const autoScrollVelocityRef = useRef(0);
  const autoScrollRafRef = useRef<number | null>(null);
  const pointerVelocityFrameRef = useRef<number | null>(null);
  const pendingPointerClientYRef = useRef<number | null>(null);
  const actualRows = Math.ceil(items.length / Math.max(gridColumns, 1));
  const displayRows = Math.max(actualRows, minRows);
  const rowHeight = cardVariant === 'compact'
    ? (compactIconSize + 24)
    : (defaultIconSize + defaultVerticalPadding * 2);
  const gridMinHeight = displayRows * rowHeight + Math.max(0, displayRows - 1) * rowGap;
  const activeDragItem = useMemo(
    () => items.find((item) => item.sortId === activeDragId) ?? null,
    [activeDragId, items],
  );

  const stopAutoScroll = useCallback(() => {
    autoScrollVelocityRef.current = 0;
    if (autoScrollRafRef.current !== null) {
      window.cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
    if (pointerVelocityFrameRef.current !== null) {
      window.cancelAnimationFrame(pointerVelocityFrameRef.current);
      pointerVelocityFrameRef.current = null;
    }
    pendingPointerClientYRef.current = null;
  }, []);

  const refreshAutoScrollBounds = useCallback(() => {
    const container = autoScrollContainerRef.current;
    if (!container) {
      autoScrollBoundsRef.current = null;
      return;
    }
    const rect = container.getBoundingClientRect();
    autoScrollBoundsRef.current = { top: rect.top, bottom: rect.bottom };
  }, []);

  const startAutoScrollLoop = useCallback(() => {
    if (autoScrollRafRef.current !== null) return;
    const tick = () => {
      const container = autoScrollContainerRef.current;
      const velocity = autoScrollVelocityRef.current;
      if (!container || Math.abs(velocity) < 0.01) {
        autoScrollRafRef.current = null;
        return;
      }
      const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
      const nextScrollTop = Math.max(0, Math.min(maxScrollTop, container.scrollTop + velocity));
      container.scrollTop = nextScrollTop;
      autoScrollRafRef.current = window.requestAnimationFrame(tick);
    };
    autoScrollRafRef.current = window.requestAnimationFrame(tick);
  }, []);

  const updateAutoScrollVelocity = useCallback((clientY: number) => {
    const container = autoScrollContainerRef.current;
    const bounds = autoScrollBoundsRef.current;
    if (!container || !bounds) return;
    let velocity = 0;
    if (clientY < bounds.top + DRAG_AUTO_SCROLL_EDGE_PX) {
      const ratio = Math.min(1, (bounds.top + DRAG_AUTO_SCROLL_EDGE_PX - clientY) / DRAG_AUTO_SCROLL_EDGE_PX);
      velocity = -(DRAG_AUTO_SCROLL_MAX_SPEED_PX * ratio * ratio);
    } else if (clientY > bounds.bottom - DRAG_AUTO_SCROLL_EDGE_PX) {
      const ratio = Math.min(1, (clientY - (bounds.bottom - DRAG_AUTO_SCROLL_EDGE_PX)) / DRAG_AUTO_SCROLL_EDGE_PX);
      velocity = DRAG_AUTO_SCROLL_MAX_SPEED_PX * ratio * ratio;
    }
    autoScrollVelocityRef.current = velocity;
    if (Math.abs(velocity) > 0.01) startAutoScrollLoop();
  }, [startAutoScrollLoop]);

  const scheduleAutoScrollVelocityUpdate = useCallback((clientY: number) => {
    pendingPointerClientYRef.current = clientY;
    if (pointerVelocityFrameRef.current !== null) return;
    pointerVelocityFrameRef.current = window.requestAnimationFrame(() => {
      pointerVelocityFrameRef.current = null;
      const nextClientY = pendingPointerClientYRef.current;
      pendingPointerClientYRef.current = null;
      if (typeof nextClientY === 'number') {
        updateAutoScrollVelocity(nextClientY);
      }
    });
  }, [updateAutoScrollVelocity]);

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

  useEffect(() => () => {
    if (clearOverlayTimerRef.current !== null) {
      window.clearTimeout(clearOverlayTimerRef.current);
      clearOverlayTimerRef.current = null;
    }
    stopAutoScroll();
  }, [stopAutoScroll]);

  useEffect(() => {
    if (!dragging) {
      stopAutoScroll();
      autoScrollBoundsRef.current = null;
      return;
    }
    const handlePointerMove = (event: PointerEvent) => {
      scheduleAutoScrollVelocityUpdate(event.clientY);
    };
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) scheduleAutoScrollVelocityUpdate(touch.clientY);
    };
    const handleWindowResize = () => {
      refreshAutoScrollBounds();
    };
    refreshAutoScrollBounds();
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('resize', handleWindowResize, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [dragging, refreshAutoScrollBounds, scheduleAutoScrollVelocityUpdate, stopAutoScroll]);

  return (
    <div 
      ref={rootRef}
      className="relative w-full" 
      data-testid="shortcut-grid"
      style={{
        minHeight: Math.max(containerHeight, gridMinHeight),
        paddingBottom: Math.max(0, bottomInset),
      }}
      onContextMenu={onGridContextMenu}
    >
      <DndContext 
        sensors={sensors}
        autoScroll={false}
        onDragStart={({ active }) => {
          if (selectionMode) return;
          if (clearOverlayTimerRef.current !== null) {
            window.clearTimeout(clearOverlayTimerRef.current);
            clearOverlayTimerRef.current = null;
          }
          autoScrollContainerRef.current = findScrollableParent(rootRef.current);
          refreshAutoScrollBounds();
          autoScrollVelocityRef.current = 0;
          setDragging(true);
          setActiveDragId(String(active.id));
        }}
        onDragCancel={() => {
          if (selectionMode) return;
          if (clearOverlayTimerRef.current !== null) {
            window.clearTimeout(clearOverlayTimerRef.current);
            clearOverlayTimerRef.current = null;
          }
          stopAutoScroll();
          autoScrollContainerRef.current = null;
          autoScrollBoundsRef.current = null;
          setDragging(false);
          setActiveDragId(null);
        }}
        onDragEnd={({ active, over }) => {
          if (selectionMode) return;
          stopAutoScroll();
          autoScrollContainerRef.current = null;
          autoScrollBoundsRef.current = null;
          setDragging(false);
          if (clearOverlayTimerRef.current !== null) {
            window.clearTimeout(clearOverlayTimerRef.current);
          }
          clearOverlayTimerRef.current = window.setTimeout(() => {
            setActiveDragId(null);
            clearOverlayTimerRef.current = null;
          }, disableReorderAnimation ? 0 : DRAG_DROP_ANIMATION_MS);
          if (!active || !over || active.id === over.id) return;
          const oldIndex = items.findIndex(i => i.sortId === String(active.id));
          const newIndex = items.findIndex(i => i.sortId === String(over.id));
          if (oldIndex < 0 || newIndex < 0) return;
          const next = arrayMove(items, oldIndex, newIndex);
          onShortcutReorder(next.map((item) => item.shortcut));
        }}
      >
        <SortableContext items={items.map(i => i.sortId)} strategy={rectSortingStrategy}>
          <div 
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${Math.max(gridColumns, 1)}, minmax(0, 1fr))`,
              columnGap: compactLayout ? '12px' : '8px',
              rowGap: `${rowGap}px`,
              touchAction: 'pan-y',
            }}
          >
            {items.map((item) => (
              <SortableShortcut 
                key={item.sortId}
                sortId={item.sortId}
                activeDragId={activeDragId}
                cardVariant={cardVariant}
                gridColumns={gridColumns}
                compactShowTitle={compactShowTitle}
                compactIconSize={compactIconSize}
                compactTitleFontSize={compactTitleFontSize}
                defaultIconSize={defaultIconSize}
                defaultTitleFontSize={defaultTitleFontSize}
                defaultUrlFontSize={defaultUrlFontSize}
                defaultVerticalPadding={defaultVerticalPadding}
                forceTextWhite={forceTextWhite}
                shortcut={item.shortcut}
                onOpen={() => {
                  if (ignoreClickRef.current) return;
                  if (selectionMode) {
                    onToggleShortcutSelection?.(item.shortcutIndex);
                    return;
                  }
                  onShortcutOpen(item.shortcut);
                }}
                onContextMenu={(event) => { if (!ignoreClickRef.current) onShortcutContextMenu(event, item.shortcutIndex, item.shortcut); }}
                selected={Boolean(selectedShortcutIndexes?.has(item.shortcutIndex))}
                selectionMode={selectionMode}
                dragDisabled={selectionMode}
                disableReorderAnimation={disableReorderAnimation}
                firefox={firefox}
              />
            ))}
          </div>
        </SortableContext>
        {typeof document !== 'undefined' ? createPortal(
          <DragOverlay
            dropAnimation={disableReorderAnimation || firefox ? null : { duration: DRAG_DROP_ANIMATION_MS, easing: DRAG_DROP_EASING }}
            zIndex={DRAG_OVERLAY_Z_INDEX}
          >
            {activeDragItem ? (
              <div className={`pointer-events-none ${cardVariant === 'compact' ? 'flex justify-center' : 'w-full'}`}>
                {firefox ? (
                  <LightweightDragPreview
                    shortcut={activeDragItem.shortcut}
                    cardVariant={cardVariant}
                    firefox={firefox}
                    compactShowTitle={compactShowTitle}
                    compactIconSize={compactIconSize}
                    compactTitleFontSize={compactTitleFontSize}
                    defaultIconSize={defaultIconSize}
                    defaultTitleFontSize={defaultTitleFontSize}
                    defaultUrlFontSize={defaultUrlFontSize}
                    defaultVerticalPadding={defaultVerticalPadding}
                    forceTextWhite={forceTextWhite}
                  />
                ) : (
                  <ShortcutCardRenderer
                    variant={cardVariant}
                    compactShowTitle={compactShowTitle}
                    compactIconSize={compactIconSize}
                    compactTitleFontSize={compactTitleFontSize}
                    defaultIconSize={defaultIconSize}
                    defaultTitleFontSize={defaultTitleFontSize}
                    defaultUrlFontSize={defaultUrlFontSize}
                    defaultVerticalPadding={defaultVerticalPadding}
                    forceTextWhite={forceTextWhite}
                    shortcut={activeDragItem.shortcut}
                    onOpen={() => {}}
                    onContextMenu={() => {}}
                  />
                )}
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        ) : null}
      </DndContext>
    </div>
  );
});
