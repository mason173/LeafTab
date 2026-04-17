import { describe, expect, it } from 'vitest';
import {
  applyStableInsert,
  coordToSequence,
  resolveDragSessionOutputs,
  resolveHighlightTarget,
  resolveHoverTarget,
  resolveInteractionState,
  resolvePreviewAnchor,
  resolveShadowPosition,
  sequenceToCoord,
  type DragSession,
  type GridNode,
  type GridSpec,
} from '@/features/shortcuts/engine/gridEngine';

const gridSpec: GridSpec = {
  columns: 4,
  rows: 4,
  cellSize: 100,
};

const occupancy: GridNode[] = [
  { id: 'a', kind: 'icon', sequence: 0 },
  { id: 'b', kind: 'icon', sequence: 1 },
  { id: 'c', kind: 'smallFolder', sequence: 2 },
  { id: 'folder-large', kind: 'bigFolder', sequence: 4 },
];

describe('gridEngine', () => {
  it('maps sequences with a zig-zag flow and back again', () => {
    expect(sequenceToCoord(0, 4)).toEqual({ row: 0, col: 0 });
    expect(sequenceToCoord(5, 4)).toEqual({ row: 1, col: 2 });
    expect(coordToSequence(1, 2, 4)).toBe(5);
    expect(coordToSequence(2, 3, 4)).toBe(11);
  });

  it('locks hover resolution to the interaction layer, not the icon box', () => {
    expect(resolveHoverTarget({ x: 150, y: 40 }, occupancy, gridSpec)).toEqual({
      type: 'interaction',
      nodeId: 'b',
      entryEdge: 'top',
    });
  });

  it('derives merge highlight from big folder merge hits', () => {
    const dragSession: DragSession = {
      globalPosition: { x: 140, y: 140 },
      mode: 'normal',
      activeNode: { id: 'dragging', kind: 'icon', sequence: 10 },
      activeTarget: {
        type: 'big-folder-merge',
        nodeId: 'folder-large',
      },
      gridSpec,
      occupancy,
    };

    expect(resolveInteractionState(dragSession)).toBe('merge-candidate');
    expect(resolveHighlightTarget(dragSession)).toEqual({
      nodeId: 'folder-large',
      type: 'merge',
    });
    expect(resolvePreviewAnchor(dragSession)).toBeNull();
  });

  it('applies stable remove-insert-shift ordering by sequence', () => {
    expect(applyStableInsert(occupancy, 'c', 0).map((node) => `${node.id}:${node.sequence}`)).toEqual([
      'c:0',
      'a:1',
      'b:2',
      'folder-large:3',
    ]);
  });

  it('projects preview anchors back into grid shadow positions', () => {
    const dragSession: DragSession = {
      globalPosition: { x: 260, y: 260 },
      mode: 'reorder-only',
      activeNode: { id: 'dragging', kind: 'smallFolder', sequence: 6 },
      activeTarget: null,
      gridSpec,
      occupancy,
    };

    const anchor = resolvePreviewAnchor(dragSession);
    expect(anchor).toEqual({
      kind: 'cell',
      sequence: 10,
      valid: true,
    });
    expect(resolveShadowPosition(anchor, gridSpec)).toEqual({ x: 200, y: 200 });
  });

  it('resolves drag session outputs from a single drag session input', () => {
    const session = {
      globalPosition: { x: 150, y: 40 },
      mode: 'normal' as const,
      activeNode: { id: 'dragging', kind: 'icon' as const, sequence: 0 },
      gridSpec,
      occupancy,
    };

    expect(resolveDragSessionOutputs({
      session,
      previousActiveTarget: null,
    })).toEqual({
      hoverTarget: {
        type: 'interaction',
        nodeId: 'b',
        entryEdge: 'top',
      },
      activeTarget: {
        type: 'interaction',
        nodeId: 'b',
        entryEdge: 'top',
      },
      interactionState: 'group-candidate',
      highlightTarget: {
        nodeId: 'b',
        type: 'group',
      },
      anchorPreview: null,
      shadowPosition: null,
    });
  });
});
