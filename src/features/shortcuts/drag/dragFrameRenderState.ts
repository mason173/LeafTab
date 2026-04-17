import { combineProjectionOffsets, type ProjectionOffset } from './dragMotion';

export function resolveHiddenDragItemId(params: {
  activeDragId: string | null;
  settlePreviewItemId?: string | null;
}): string | null {
  return params.activeDragId ?? params.settlePreviewItemId ?? null;
}

export function resolveDragFrameProjectionOffset(params: {
  itemId: string;
  activeDragId: string | null;
  reorderProjectionOffsets?: ReadonlyMap<string, ProjectionOffset>;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
  invertReorderProjection?: boolean;
}): ProjectionOffset {
  const {
    itemId,
    activeDragId,
    reorderProjectionOffsets,
    layoutShiftOffsets,
    invertReorderProjection = false,
  } = params;

  const reorderProjection = activeDragId && activeDragId !== itemId
    ? reorderProjectionOffsets?.get(itemId) ?? null
    : null;
  const normalizedReorderProjection = reorderProjection
    ? {
        x: invertReorderProjection ? -reorderProjection.x : reorderProjection.x,
        y: invertReorderProjection ? -reorderProjection.y : reorderProjection.y,
      }
    : null;

  return combineProjectionOffsets(
    normalizedReorderProjection,
    activeDragId ? null : layoutShiftOffsets?.get(itemId),
  );
}

export function resolveDragFrameDraggingState(params: {
  itemId: string;
  hiddenItemId: string | null;
}): boolean {
  return params.hiddenItemId === params.itemId;
}

export function resolveGridDragFrameState(params: {
  itemId: string;
  hiddenItemId: string | null;
  activeDragId: string | null;
  reorderProjectionOffsets?: ReadonlyMap<string, ProjectionOffset>;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
  invertReorderProjection?: boolean;
}): {
  isDragging: boolean;
  projectionOffset: ProjectionOffset;
} {
  return {
    isDragging: resolveDragFrameDraggingState({
      itemId: params.itemId,
      hiddenItemId: params.hiddenItemId,
    }),
    projectionOffset: resolveDragFrameProjectionOffset({
      itemId: params.itemId,
      activeDragId: params.activeDragId,
      reorderProjectionOffsets: params.reorderProjectionOffsets,
      layoutShiftOffsets: params.layoutShiftOffsets,
      invertReorderProjection: params.invertReorderProjection,
    }),
  };
}
