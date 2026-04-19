import { type PointerPoint } from '@leaftab/workspace-core';
import { type GridHeatZone } from './heatZone';
import { classifyGridHeatZone, resolveGridAimPercent } from './heatZone';
import { type UniformGridCellHit, type UniformGridMetrics } from './uniformGrid';

export type GridTargetKind = 'shortcut' | 'folder' | 'empty';

export type GridHeatZoneInspector = {
  slotIndex: number;
  row: number;
  column: number;
  zone: GridHeatZone;
  targetId: string | null;
  targetTitle: string | null;
  targetKind: GridTargetKind;
  aimX: number;
  aimY: number;
  reorderOnlyMode: boolean;
  footprintSlotIndexes: number[];
  largeTarget: boolean;
};

export type GridHitRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function buildUniformGridHitRect(params: {
  hit: UniformGridCellHit;
  metrics: UniformGridMetrics;
}): GridHitRect {
  return {
    left: params.hit.cellLeft,
    top: params.hit.cellTop,
    width: params.metrics.columnWidth,
    height: params.metrics.rowHeight,
  };
}

export function buildGridHeatZoneInspector(params: {
  point: PointerPoint;
  slotIndex: number;
  row: number;
  column: number;
  rect: GridHitRect;
  coreInset: number;
  reorderOnlyMode: boolean;
  targetId: string | null;
  targetTitle: string | null;
  targetKind: GridTargetKind;
  footprintSlotIndexes: number[];
  largeTarget: boolean;
  disableEdgeZones?: boolean;
}): GridHeatZoneInspector {
  const aim = resolveGridAimPercent({
    point: params.point,
    rect: params.rect,
  });

  return {
    slotIndex: params.slotIndex,
    row: params.row,
    column: params.column,
    zone: classifyGridHeatZone({
      point: params.point,
      rect: params.rect,
      coreInset: params.coreInset,
      reorderOnlyMode: params.reorderOnlyMode,
      disableEdgeZones: params.disableEdgeZones ?? false,
    }),
    targetId: params.targetId,
    targetTitle: params.targetTitle,
    targetKind: params.targetKind,
    aimX: aim?.aimX ?? 0,
    aimY: aim?.aimY ?? 0,
    reorderOnlyMode: params.reorderOnlyMode,
    footprintSlotIndexes: params.footprintSlotIndexes,
    largeTarget: params.largeTarget,
  };
}
