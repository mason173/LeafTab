export type DragPreviewRectSpec = {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
};

export type DragPreviewLayoutSpec = {
  width: number;
  height: number;
  previewRect?: DragPreviewRectSpec | null;
  previewBorderRadius?: string;
};

export type NormalizedDragPreviewLayout = {
  width: number;
  height: number;
  previewWidth: number;
  previewHeight: number;
  previewOffsetX: number;
  previewOffsetY: number;
  previewBorderRadius?: string;
};

export function normalizeDragPreviewLayout<T extends DragPreviewLayoutSpec>(
  layout: T,
): NormalizedDragPreviewLayout {
  const width = Math.max(1, layout.width);
  const height = Math.max(1, layout.height);
  const previewRect = layout.previewRect ?? {
    left: 0,
    top: 0,
    width,
    height,
    borderRadius: layout.previewBorderRadius,
  };

  return {
    width,
    height,
    previewWidth: Math.max(1, previewRect.width),
    previewHeight: Math.max(1, previewRect.height),
    previewOffsetX: previewRect.left,
    previewOffsetY: previewRect.top,
    previewBorderRadius: previewRect.borderRadius,
  };
}

export function buildDragPlaceholderStyle(layout: Pick<NormalizedDragPreviewLayout, 'width' | 'height'>) {
  return {
    width: layout.width,
    height: layout.height,
  };
}
