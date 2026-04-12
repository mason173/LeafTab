import React from 'react';
import type { ShortcutCardVariant } from '@/components/shortcuts/shortcutCardVariant';
import { getShortcutIconBorderRadius } from '@/utils/shortcutIconSettings';
import type { ProjectionOffset } from '@/features/shortcuts/drag/gridDragEngine';

export const SHORTCUT_DRAG_SETTLE_TRANSITION = 'transform 320ms ease-in-out';
const MERGE_PREVIEW_BORDER_WIDTH_PX = 2.5;
const MERGE_PREVIEW_BORDER_COLOR = 'rgba(255,255,255,0.3)';

function MergePreviewHighlight({
  cardVariant,
  compactPreviewWidth,
  compactPreviewHeight,
  iconCornerRadius,
  compactPreviewBorderRadius,
}: {
  cardVariant: ShortcutCardVariant;
  compactPreviewWidth: number;
  compactPreviewHeight: number;
  iconCornerRadius: number;
  compactPreviewBorderRadius?: string;
}) {
  if (cardVariant === 'compact') {
    const borderRadius = compactPreviewBorderRadius || getShortcutIconBorderRadius(iconCornerRadius);
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 z-10"
        style={{
          top: compactPreviewHeight / 2,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          className="bg-white/[0.04] dark:bg-white/[0.03]"
          style={{
            width: compactPreviewWidth + 10,
            height: compactPreviewHeight + 10,
            borderRadius: `calc(${borderRadius} + 6px)`,
            border: `${MERGE_PREVIEW_BORDER_WIDTH_PX}px solid ${MERGE_PREVIEW_BORDER_COLOR}`,
            boxShadow: '0 12px 26px rgba(0,0,0,0.14), inset 0 0 0 1px rgba(255,255,255,0.05)',
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
        border: `${MERGE_PREVIEW_BORDER_WIDTH_PX}px solid ${MERGE_PREVIEW_BORDER_COLOR}`,
        boxShadow: '0 12px 28px rgba(0,0,0,0.14), inset 0 0 0 1px rgba(255,255,255,0.05)',
      }}
    />
  );
}

export function ShortcutDragPlaceholder({
  cardVariant,
  compactPlaceholderWidth,
  compactPlaceholderHeight,
  defaultPlaceholderHeight,
}: {
  cardVariant: ShortcutCardVariant;
  compactPlaceholderWidth: number;
  compactPlaceholderHeight: number;
  defaultPlaceholderHeight: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none rounded-xl border-2 border-dashed border-primary/45 bg-primary/10 ${
        cardVariant === 'compact' ? 'mx-auto' : 'w-full'
      }`}
      style={cardVariant === 'compact'
        ? { width: compactPlaceholderWidth, height: compactPlaceholderHeight }
        : { height: defaultPlaceholderHeight }}
    />
  );
}

type DraggableShortcutItemFrameProps = {
  cardVariant: ShortcutCardVariant;
  compactIconSize: number;
  compactPreviewWidth?: number;
  compactPreviewHeight?: number;
  compactPlaceholderHeight?: number;
  compactPreviewBorderRadius?: string;
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
  compactPreviewWidth = compactIconSize,
  compactPreviewHeight = compactIconSize,
  compactPlaceholderHeight = compactIconSize + 24,
  compactPreviewBorderRadius,
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
            compactPreviewWidth={compactPreviewWidth}
            compactPreviewHeight={compactPreviewHeight}
            compactPreviewBorderRadius={compactPreviewBorderRadius}
            iconCornerRadius={iconCornerRadius}
          />
        ) : null}
        {isDragging && !hideDragPlaceholder ? (
          <ShortcutDragPlaceholder
            cardVariant={cardVariant}
            compactPlaceholderWidth={compactPreviewWidth}
            compactPlaceholderHeight={compactPlaceholderHeight}
            defaultPlaceholderHeight={defaultPlaceholderHeight}
          />
        ) : isDragging ? null : children}
        {selectionOverlay}
      </div>
    </div>
  );
}
