import React from 'react';
import { DRAG_MOTION_ANIMATIONS_ENABLED } from '@/features/shortcuts/drag/dragAnimationConfig';
import type { ProjectionOffset } from '@/features/shortcuts/drag/dragMotion';

const GRID_DRAG_SETTLE_TRANSITION = 'transform 320ms ease-in-out';

function buildTransform(params: {
  isDragging: boolean;
  centerPreviewActive: boolean;
  projectionOffset?: ProjectionOffset | null;
}) {
  const { isDragging, centerPreviewActive, projectionOffset } = params;
  if (isDragging) {
    return 'scale(0.98)';
  }

  const transform = [
    projectionOffset ? `translate(${projectionOffset.x}px, ${projectionOffset.y}px)` : null,
    centerPreviewActive ? 'scale(1.02)' : null,
  ].filter(Boolean).join(' ');

  return transform || undefined;
}

export type DragItemFrameSettlePreview = {
  itemId: string;
  item: unknown;
  fromLeft: number;
  fromTop: number;
  toLeft: number;
  toTop: number;
  settling: boolean;
};

export function GridDragItemFrame({
  isDragging,
  children,
  centerPreviewActive = false,
  projectionOffset,
  disableReorderAnimation = false,
  hideDragPlaceholder = false,
  firefox = false,
  dimmed = false,
  dragDisabled = false,
  registerElement,
  onPointerDown,
  placeholder,
  centerPreview,
  selectionOverlay,
  frameProps,
}: {
  isDragging: boolean;
  children: React.ReactNode;
  centerPreviewActive?: boolean;
  projectionOffset?: ProjectionOffset | null;
  disableReorderAnimation?: boolean;
  hideDragPlaceholder?: boolean;
  firefox?: boolean;
  dimmed?: boolean;
  dragDisabled?: boolean;
  registerElement?: (element: HTMLDivElement | null) => void;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  placeholder?: React.ReactNode;
  centerPreview?: React.ReactNode;
  selectionOverlay?: React.ReactNode;
  frameProps?: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
}) {
  const transform = buildTransform({
    isDragging,
    centerPreviewActive,
    projectionOffset,
  });
  const className = frameProps?.className ?? '';
  const style: React.CSSProperties = {
    ...frameProps?.style,
    opacity: isDragging ? 0.32 : undefined,
    transform,
    transition: !DRAG_MOTION_ANIMATIONS_ENABLED || disableReorderAnimation ? undefined : GRID_DRAG_SETTLE_TRANSITION,
    willChange: !firefox && (isDragging || centerPreviewActive || Boolean(projectionOffset))
      ? 'transform, opacity'
      : undefined,
    touchAction: dragDisabled ? 'auto' : 'none',
  };

  return (
    <div className="relative">
      <div
        ref={registerElement}
        {...frameProps}
        className={`relative isolate ${dimmed ? 'opacity-75' : ''} ${dragDisabled ? '' : 'cursor-grab active:cursor-grabbing'} ${className}`.trim()}
        style={style}
        onPointerDown={dragDisabled ? undefined : onPointerDown}
        onDragStart={(event) => {
          event.preventDefault();
        }}
      >
        {centerPreviewActive ? centerPreview : null}
        {isDragging && !hideDragPlaceholder ? placeholder : null}
        {isDragging && hideDragPlaceholder ? null : children}
        {selectionOverlay}
      </div>
    </div>
  );
}
