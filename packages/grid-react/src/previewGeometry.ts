export type GridPreviewRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
};

export type PreviewGeometryInput = {
  width: number;
  height: number;
  previewWidth?: number;
  previewHeight?: number;
  previewOffsetX?: number;
  previewOffsetY?: number;
  previewBorderRadius?: string;
  previewRect?: GridPreviewRect;
};

export type NormalizedPreviewGeometry = {
  previewWidth: number;
  previewHeight: number;
  previewOffsetX: number;
  previewOffsetY: number;
  previewBorderRadius?: string;
  previewRect: GridPreviewRect;
};

export function normalizePreviewGeometry(input: PreviewGeometryInput): NormalizedPreviewGeometry {
  if (input.previewRect) {
    const previewRect: GridPreviewRect = {
      left: Math.max(0, input.previewRect.left),
      top: Math.max(0, input.previewRect.top),
      width: Math.max(1, input.previewRect.width),
      height: Math.max(1, input.previewRect.height),
      borderRadius: input.previewRect.borderRadius ?? input.previewBorderRadius,
    };

    return {
      previewWidth: previewRect.width,
      previewHeight: previewRect.height,
      previewOffsetX: previewRect.left,
      previewOffsetY: previewRect.top,
      previewBorderRadius: previewRect.borderRadius,
      previewRect,
    };
  }

  const previewWidth = Math.max(1, input.previewWidth ?? input.width);
  const previewHeight = Math.max(1, input.previewHeight ?? input.height);
  const previewOffsetX = input.previewOffsetX ?? Math.max(0, (input.width - previewWidth) / 2);
  const previewOffsetY = input.previewOffsetY ?? Math.max(0, (input.height - previewHeight) / 2);
  const previewBorderRadius = input.previewBorderRadius;

  return {
    previewWidth,
    previewHeight,
    previewOffsetX,
    previewOffsetY,
    previewBorderRadius,
    previewRect: {
      left: previewOffsetX,
      top: previewOffsetY,
      width: previewWidth,
      height: previewHeight,
      borderRadius: previewBorderRadius,
    },
  };
}
