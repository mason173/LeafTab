export type DualIntentHoverResolution<TIntent> = {
  interactionIntent: TIntent | null;
  visualProjectionIntent: TIntent | null;
};

export function buildHoverResolution<TIntent>(params: {
  interactionIntent: TIntent | null;
  visualProjectionIntent: TIntent | null;
  emptyResolution: DualIntentHoverResolution<TIntent>;
}): DualIntentHoverResolution<TIntent> {
  const { interactionIntent, visualProjectionIntent, emptyResolution } = params;
  if (!interactionIntent && !visualProjectionIntent) {
    return emptyResolution;
  }

  return {
    interactionIntent,
    visualProjectionIntent,
  };
}

export function buildMirroredHoverResolution<TIntent>(params: {
  intent: TIntent | null;
  emptyResolution: DualIntentHoverResolution<TIntent>;
}): DualIntentHoverResolution<TIntent> {
  return buildHoverResolution({
    interactionIntent: params.intent,
    visualProjectionIntent: params.intent,
    emptyResolution: params.emptyResolution,
  });
}

export function resolveDisplayedReorderEdge(params: {
  placeholderSlotIndex: number;
  targetIndex: number;
}): 'before' | 'after' {
  return params.placeholderSlotIndex < params.targetIndex ? 'after' : 'before';
}

export function resolveLinearFallbackInsertion(params: {
  slotIndex: number;
  itemCount: number;
}): {
  targetIndex: number;
  edge: 'before' | 'after';
} | null {
  const { slotIndex, itemCount } = params;
  if (itemCount <= 0) {
    return null;
  }

  const targetIndex = Math.max(0, Math.min(slotIndex, itemCount));
  return {
    targetIndex,
    edge: targetIndex <= 0 ? 'before' : 'after',
  };
}
