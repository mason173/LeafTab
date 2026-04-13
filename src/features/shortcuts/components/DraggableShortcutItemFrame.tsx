import React from 'react';
import type { ShortcutCardVariant } from '@/components/shortcuts/shortcutCardVariant';
import { getShortcutIconBorderRadius } from '@/utils/shortcutIconSettings';
import type { ProjectionOffset } from '@/features/shortcuts/drag/gridDragEngine';

export const SHORTCUT_DRAG_SETTLE_TRANSITION = 'transform 320ms ease-in-out';
const MERGE_PREVIEW_DEFAULT_GLOW_SHADOW = [
  '0 12px 28px rgba(0,0,0,0.14)',
  '0 0 0 1px rgba(255,255,255,0.14)',
  '0 0 0 10px rgba(255,255,255,0.05)',
].join(', ');
const MERGE_PREVIEW_COMPACT_TINT = 'rgba(232, 236, 240, 0.3)';

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
    const maskId = React.useId();
    const borderRadius = compactPreviewBorderRadius || getShortcutIconBorderRadius(iconCornerRadius);
    const haloInset = 6;
    const radiusExpansionPx = 4;
    const outerWidth = compactPreviewWidth + haloInset * 2;
    const outerHeight = compactPreviewHeight + haloInset * 2;
    const outerRadius = `calc(${borderRadius} + ${radiusExpansionPx}px)`;
    const innerRadius = borderRadius;

    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 z-0 -translate-x-1/2 overflow-visible"
        style={{
          width: outerWidth,
          height: outerHeight,
          top: -haloInset,
        }}
      >
        <svg
          width={outerWidth}
          height={outerHeight}
          viewBox={`0 0 ${outerWidth} ${outerHeight}`}
          className="block overflow-visible"
        >
          <defs>
            <mask id={maskId}>
              <rect
                x="0"
                y="0"
                width={outerWidth}
                height={outerHeight}
                rx={outerRadius}
                ry={outerRadius}
                fill="white"
              />
              <rect
                x={haloInset}
                y={haloInset}
                width={compactPreviewWidth}
                height={compactPreviewHeight}
                rx={innerRadius}
                ry={innerRadius}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width={outerWidth}
            height={outerHeight}
            rx={outerRadius}
            ry={outerRadius}
            fill={MERGE_PREVIEW_COMPACT_TINT}
            mask={`url(#${maskId})`}
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-[-2px] z-0 rounded-[22px]"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
        boxShadow: MERGE_PREVIEW_DEFAULT_GLOW_SHADOW,
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
        className={`${frameClassName} isolate ${dimmed ? 'opacity-75' : ''} ${dragDisabled ? '' : 'cursor-grab active:cursor-grabbing'} ${frameProps?.className ?? ''}`}
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
        <div className="relative z-10">
          {isDragging && !hideDragPlaceholder ? (
            <ShortcutDragPlaceholder
              cardVariant={cardVariant}
              compactPlaceholderWidth={compactPreviewWidth}
              compactPlaceholderHeight={compactPlaceholderHeight}
              defaultPlaceholderHeight={defaultPlaceholderHeight}
            />
          ) : isDragging ? null : children}
        </div>
        {selectionOverlay}
      </div>
    </div>
  );
}
