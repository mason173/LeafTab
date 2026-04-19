import { type PointerPoint } from '@leaftab/workspace-core';

export type GridHeatZone = 'core' | 'T' | 'R' | 'B' | 'L' | null;

type HeatZoneRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function classifyGridHeatZone(params: {
  point: PointerPoint;
  rect: HeatZoneRect;
  coreInset: number;
  reorderOnlyMode: boolean;
  disableEdgeZones?: boolean;
}): GridHeatZone {
  const {
    point,
    rect,
    coreInset,
    reorderOnlyMode,
    disableEdgeZones = false,
  } = params;
  const x = (point.x - rect.left) / rect.width;
  const y = (point.y - rect.top) / rect.height;

  if (x < 0 || x > 1 || y < 0 || y > 1) {
    return null;
  }

  const insideCore = (
    x >= coreInset
    && x <= 1 - coreInset
    && y >= coreInset
    && y <= 1 - coreInset
  );

  if (insideCore && !reorderOnlyMode) {
    return 'core';
  }

  if (disableEdgeZones) {
    return null;
  }

  const dx = x - 0.5;
  const dy = y - 0.5;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx < 0 ? 'L' : 'R';
  }

  return dy < 0 ? 'T' : 'B';
}

export function resolveGridAimPercent(params: {
  point: PointerPoint;
  rect: HeatZoneRect;
}): { aimX: number; aimY: number } | null {
  const { point, rect } = params;
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return {
    aimX: ((point.x - rect.left) / rect.width) * 100,
    aimY: ((point.y - rect.top) / rect.height) * 100,
  };
}
