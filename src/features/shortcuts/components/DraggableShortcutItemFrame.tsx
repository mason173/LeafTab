import React from 'react';
import type { ShortcutCardVariant } from '@/components/shortcuts/shortcutCardVariant';
import { getShortcutIconBorderRadius } from '@/utils/shortcutIconSettings';
import type { ProjectionOffset } from '@/features/shortcuts/drag/gridDragEngine';

export const SHORTCUT_DRAG_SETTLE_TRANSITION = 'transform 320ms cubic-bezier(0.2, 0.9, 0.2, 1.12)';

function MergePreviewHighlight({
  cardVariant,
  compactIconSize,
  iconCornerRadius,
}: {
  cardVariant: ShortcutCardVariant;
  compactIconSize: number;
  iconCornerRadius: number;
}) {
  if (cardVariant === 'compact') {
    const borderRadius = getShortcutIconBorderRadius(iconCornerRadius);
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 z-10"
        style={{ transform: 'translateX(-50%) translateY(-4px)' }}
      >
        <div
          className="bg-white/8 dark:bg-white/[0.06]"
          style={{
            width: compactIconSize + 10,
            height: compactIconSize + 10,
            borderRadius: `calc(${borderRadius} + 6px)`,
            border: '1.5px solid rgba(255,255,255,0.92)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.22), 0 12px 26px rgba(0,0,0,0.14), inset 0 0 0 1px rgba(255,255,255,0.14)',
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-[-4px] z-10 rounded-[22px] bg-white/[0.07] dark:bg-white/[0.04]"
      style={{
        border: '1.5px solid rgba(255,255,255,0.92)',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.22), 0 12px 28px rgba(0,0,0,0.14), inset 0 0 0 1px rgba(255,255,255,0.12)',
      }}
    />
  );
}

export function ShortcutDragPlaceholder({
  cardVariant,
  compactIconSize,
  defaultPlaceholderHeight,
}: {
  cardVariant: ShortcutCardVariant;
  compactIconSize: number;
  defaultPlaceholderHeight: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none rounded-xl border-2 border-dashed border-primary/45 bg-primary/10 ${
        cardVariant === 'compact' ? 'mx-auto' : 'w-full'
      }`}
      style={cardVariant === 'compact'
        ? { width: compactIconSize, height: compactIconSize + 24 }
        : { height: defaultPlaceholderHeight }}
    />
  );
}

type DraggableShortcutItemFrameProps = {
  cardVariant: ShortcutCardVariant;
  compactIconSize: number;
  iconCornerRadius: number;
  defaultPlaceholderHeight: number;
  isDragging: boolean;
  hideDragPlaceholder?: boolean;
  centerPreviewActive?: boolean;
  projectionOffset?: ProjectionOffset | null;
  disableReorderAnimation?: boolean;
  firefox?: boolean;
  dimmed?: boolean;
  dragDisabled?: boolean;
  registerElement?: (element: HTMLDivElement | null) => void;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
  selectionOverlay?: React.ReactNode;
  frameProps?: Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'ref' | 'onPointerDown' | 'onDragStart'> & {
    [key: `data-${string}`]: string | number | boolean | undefined;
  };
};

export function DraggableShortcutItemFrame({
  cardVariant,
  compactIconSize,
  iconCornerRadius,
  defaultPlaceholderHeight,
  isDragging,
  hideDragPlaceholder = false,
  centerPreviewActive = false,
  projectionOffset,
  disableReorderAnimation = false,
  firefox = false,
  dimmed = false,
  dragDisabled = false,
  registerElement,
  onPointerDown,
  children,
  selectionOverlay,
  frameProps,
}: DraggableShortcutItemFrameProps) {
  const frameClassName = cardVariant === 'compact'
    ? 'relative inline-flex justify-center'
    : 'relative w-full';
  const itemTransform = isDragging
    ? 'scale(0.98)'
    : [
        projectionOffset ? `translate(${projectionOffset.x}px, ${projectionOffset.y}px)` : null,
        centerPreviewActive ? 'scale(1.02)' : null,
      ].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`relative ${cardVariant === 'compact' ? 'flex justify-center' : 'w-full'}`}>
      <div
        ref={registerElement}
        {...frameProps}
        className={`${frameClassName} ${dimmed ? 'opacity-75' : ''} ${dragDisabled ? '' : 'cursor-grab active:cursor-grabbing'} ${frameProps?.className ?? ''}`}
        style={{
          ...frameProps?.style,
          opacity: isDragging ? 0.32 : undefined,
          transform: itemTransform,
          transition: disableReorderAnimation ? undefined : SHORTCUT_DRAG_SETTLE_TRANSITION,
          willChange: !firefox && (isDragging || centerPreviewActive || Boolean(projectionOffset)) ? 'transform, opacity' : undefined,
          touchAction: dragDisabled ? 'auto' : 'none',
        }}
        onPointerDown={dragDisabled ? undefined : onPointerDown}
        onDragStart={(event) => {
          event.preventDefault();
        }}
      >
        {centerPreviewActive ? (
          <MergePreviewHighlight
            cardVariant={cardVariant}
            compactIconSize={compactIconSize}
            iconCornerRadius={iconCornerRadius}
          />
        ) : null}
        {isDragging && !hideDragPlaceholder ? (
          <ShortcutDragPlaceholder
            cardVariant={cardVariant}
            compactIconSize={compactIconSize}
            defaultPlaceholderHeight={defaultPlaceholderHeight}
          />
        ) : isDragging ? null : children}
        {selectionOverlay}
      </div>
    </div>
  );
}
