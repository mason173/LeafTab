import { createRootDragDirectionMap } from '@/features/shortcuts/drag/types';
import type { DragPoint, RootDragDirectionMap } from '@/features/shortcuts/drag/types';

export type GridNodeKind = 'icon' | 'smallFolder' | 'bigFolder';
export type DragMode = 'normal' | 'reorder-only' | 'external-insert';
export type EntryEdge = 'left' | 'right' | 'top' | 'bottom';
export type InteractionState = 'idle' | 'reorder-candidate' | 'group-candidate' | 'merge-candidate';

export type GridCoord = {
  row: number;
  col: number;
};

export type GridSpec = {
  columns: number;
  rows: number;
  cellSize: number;
  originX?: number;
  originY?: number;
  interactionSizeRatio?: number;
  bigFolderMergeInset?: number;
};

export type GridNode = {
  id: string;
  kind: GridNodeKind;
  sequence: number;
};

export type HoverTarget =
  | {
      type: 'interaction';
      nodeId: string;
      entryEdge: EntryEdge;
    }
  | {
      type: 'big-folder-merge';
      nodeId: string;
    };

export type HighlightTarget = {
  nodeId: string;
  type: 'group' | 'merge';
};

export type AnchorPreview =
  | {
      kind: 'cell';
      sequence: number;
      valid: boolean;
    }
  | {
      kind: 'big-folder-center';
      centerAnchor: GridCoord;
      valid: boolean;
    };

export type DragSession = {
  globalPosition: DragPoint;
  previousGlobalPosition?: DragPoint | null;
  mode: DragMode;
  activeNode: GridNode;
  activeTarget: HoverTarget | null;
  directionMap: RootDragDirectionMap;
  gridSpec: GridSpec;
  occupancy: readonly GridNode[];
};

export type DragSessionInput = Omit<DragSession, 'activeTarget'>;

export type DragSessionOutputs = {
  hoverTarget: HoverTarget | null;
  activeTarget: HoverTarget | null;
  interactionState: InteractionState;
  highlightTarget: HighlightTarget | null;
  anchorPreview: AnchorPreview | null;
  shadowPosition: DragPoint | null;
};

const DEFAULT_INTERACTION_SIZE_RATIO = 0.8;
const DEFAULT_BIG_FOLDER_MERGE_INSET = 0.12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getCellTopLeft(coord: GridCoord, gridSpec: GridSpec): DragPoint {
  return {
    x: (gridSpec.originX ?? 0) + coord.col * gridSpec.cellSize,
    y: (gridSpec.originY ?? 0) + coord.row * gridSpec.cellSize,
  };
}

function getInteractionRect(node: GridNode, gridSpec: GridSpec) {
  const coord = sequenceToCoord(node.sequence, gridSpec.columns);
  const cellTopLeft = getCellTopLeft(coord, gridSpec);
  const interactionSize = gridSpec.cellSize * (gridSpec.interactionSizeRatio ?? DEFAULT_INTERACTION_SIZE_RATIO);
  const horizontalInset = (gridSpec.cellSize - interactionSize) / 2;
  const topInset = gridSpec.cellSize * 0.08;

  return {
    left: cellTopLeft.x + horizontalInset,
    top: cellTopLeft.y + topInset,
    right: cellTopLeft.x + horizontalInset + interactionSize,
    bottom: cellTopLeft.y + topInset + interactionSize,
    width: interactionSize,
    height: interactionSize,
  };
}

function getBigFolderMergeRect(node: GridNode, gridSpec: GridSpec) {
  const topLeft = sequenceToCoord(node.sequence, gridSpec.columns);
  const origin = getCellTopLeft(topLeft, gridSpec);
  const inset = gridSpec.cellSize * (gridSpec.bigFolderMergeInset ?? DEFAULT_BIG_FOLDER_MERGE_INSET);
  const size = gridSpec.cellSize * 2;

  return {
    left: origin.x + inset,
    top: origin.y + inset,
    right: origin.x + size - inset,
    bottom: origin.y + size - inset,
  };
}

function pointInRect(point: DragPoint, rect: { left: number; top: number; right: number; bottom: number }) {
  return point.x >= rect.left
    && point.x <= rect.right
    && point.y >= rect.top
    && point.y <= rect.bottom;
}

function resolveEntryEdge(point: DragPoint, rect: { left: number; top: number; right: number; bottom: number }): EntryEdge {
  const distances = [
    { edge: 'left' as const, distance: Math.abs(point.x - rect.left) },
    { edge: 'right' as const, distance: Math.abs(rect.right - point.x) },
    { edge: 'top' as const, distance: Math.abs(point.y - rect.top) },
    { edge: 'bottom' as const, distance: Math.abs(rect.bottom - point.y) },
  ];

  distances.sort((a, b) => a.distance - b.distance);
  return distances[0]?.edge ?? 'left';
}

function resolveFrozenTargetDirection(
  directionMap: RootDragDirectionMap | null | undefined,
  targetNodeId: string,
): 'above' | 'below' | 'left' | 'right' | null {
  if (!directionMap) {
    return null;
  }
  if (directionMap.upper.has(targetNodeId)) {
    return 'above';
  }
  if (directionMap.lower.has(targetNodeId)) {
    return 'below';
  }
  if (directionMap.left.has(targetNodeId)) {
    return 'left';
  }
  if (directionMap.right.has(targetNodeId)) {
    return 'right';
  }
  return null;
}

function resolveSequenceFromPosition(globalPosition: DragPoint, gridSpec: GridSpec): number {
  const localX = globalPosition.x - (gridSpec.originX ?? 0);
  const localY = globalPosition.y - (gridSpec.originY ?? 0);
  const row = clamp(Math.floor(localY / gridSpec.cellSize), 0, Math.max(gridSpec.rows - 1, 0));
  const col = clamp(Math.floor(localX / gridSpec.cellSize), 0, Math.max(gridSpec.columns - 1, 0));
  return coordToSequence(row, col, gridSpec.columns);
}

function isBigFolder(node: GridNode | null | undefined): boolean {
  return node?.kind === 'bigFolder';
}

export function sequenceToCoord(seq: number, columns: number): GridCoord {
  const safeColumns = Math.max(columns, 1);
  const row = Math.floor(Math.max(seq, 0) / safeColumns);
  const offset = Math.max(seq, 0) % safeColumns;

  return {
    row,
    col: row % 2 === 0 ? offset : safeColumns - 1 - offset,
  };
}

export function coordToSequence(row: number, col: number, columns: number): number {
  const safeColumns = Math.max(columns, 1);
  const clampedRow = Math.max(row, 0);
  const clampedCol = clamp(col, 0, safeColumns - 1);
  const offset = clampedRow % 2 === 0 ? clampedCol : safeColumns - 1 - clampedCol;
  return clampedRow * safeColumns + offset;
}

export function resolveHoverTarget(
  globalPosition: DragPoint,
  nodes: readonly GridNode[],
  gridSpec: GridSpec,
): HoverTarget | null {
  for (const node of nodes) {
    if (!isBigFolder(node)) continue;
    const mergeRect = getBigFolderMergeRect(node, gridSpec);
    if (pointInRect(globalPosition, mergeRect)) {
      return {
        type: 'big-folder-merge',
        nodeId: node.id,
      };
    }
  }

  for (const node of nodes) {
    const interactionRect = getInteractionRect(node, gridSpec);
    if (!pointInRect(globalPosition, interactionRect)) continue;
    return {
      type: 'interaction',
      nodeId: node.id,
      entryEdge: resolveEntryEdge(globalPosition, interactionRect),
    };
  }

  return null;
}

export function buildGridDirectionMap(params: {
  activeNode: GridNode;
  occupancy: readonly GridNode[];
  gridSpec: GridSpec;
}): RootDragDirectionMap {
  const activeCoord = sequenceToCoord(params.activeNode.sequence, params.gridSpec.columns);
  const upper = new Set<string>();
  const lower = new Set<string>();
  const left = new Set<string>();
  const right = new Set<string>();

  params.occupancy.forEach((node) => {
    if (node.id === params.activeNode.id) {
      return;
    }

    const targetCoord = sequenceToCoord(node.sequence, params.gridSpec.columns);
    if (targetCoord.row < activeCoord.row) {
      upper.add(node.id);
      return;
    }
    if (targetCoord.row > activeCoord.row) {
      lower.add(node.id);
      return;
    }
    if (targetCoord.col < activeCoord.col) {
      left.add(node.id);
      return;
    }
    if (targetCoord.col > activeCoord.col) {
      right.add(node.id);
    }
  });

  return createRootDragDirectionMap({
    upper,
    lower,
    left,
    right,
  });
}

export function resolveActiveTarget(
  prevActiveTarget: HoverTarget | null,
  hoverTarget: HoverTarget | null,
  dragSession: Omit<DragSession, 'activeTarget'>,
): HoverTarget | null {
  if (hoverTarget?.type === 'big-folder-merge') {
    return hoverTarget;
  }

  if (prevActiveTarget?.type === 'big-folder-merge') {
    const previousBigFolder = dragSession.occupancy.find((node) => node.id === prevActiveTarget.nodeId);
    if (previousBigFolder && pointInRect(dragSession.globalPosition, getBigFolderMergeRect(previousBigFolder, dragSession.gridSpec))) {
      return prevActiveTarget;
    }
  }

  if (prevActiveTarget?.type === 'interaction') {
    const previousNode = dragSession.occupancy.find((node) => node.id === prevActiveTarget.nodeId);
    if (previousNode) {
      const previousRect = getInteractionRect(previousNode, dragSession.gridSpec);
      if (pointInRect(dragSession.globalPosition, previousRect)) {
        return {
          type: 'interaction',
          nodeId: previousNode.id,
          entryEdge: resolveEntryEdge(dragSession.globalPosition, previousRect),
        };
      }
    }
  }

  return hoverTarget;
}

export function resolveInteractionState(dragSession: DragSession): InteractionState {
  const { activeTarget, activeNode, occupancy, directionMap, mode } = dragSession;
  if (!activeTarget) {
    return 'idle';
  }

  if (activeTarget.type === 'big-folder-merge') {
    return activeNode.kind === 'icon' && mode === 'normal' ? 'merge-candidate' : 'idle';
  }

  if (mode !== 'normal' || activeNode.kind !== 'icon') {
    return 'reorder-candidate';
  }

  const targetNode = occupancy.find((node) => node.id === activeTarget.nodeId);
  if (!targetNode) {
    return 'idle';
  }

  if (targetNode.kind !== 'icon') {
    return 'reorder-candidate';
  }

  const relativeDirection = resolveFrozenTargetDirection(directionMap, targetNode.id);
  if (!relativeDirection) {
    return 'reorder-candidate';
  }
  const entryEdge = activeTarget.entryEdge;

  if (relativeDirection === 'above') {
    return entryEdge === 'right' || entryEdge === 'bottom' ? 'group-candidate' : 'reorder-candidate';
  }
  if (relativeDirection === 'below') {
    return entryEdge === 'left' || entryEdge === 'top' ? 'group-candidate' : 'reorder-candidate';
  }
  if (relativeDirection === 'left') {
    return entryEdge === 'right' || entryEdge === 'bottom' ? 'group-candidate' : 'reorder-candidate';
  }
  if (relativeDirection === 'right') {
    return entryEdge === 'left' || entryEdge === 'top' ? 'group-candidate' : 'reorder-candidate';
  }

  return 'reorder-candidate';
}

export function resolvePreviewAnchor(dragSession: DragSession): AnchorPreview | null {
  const interactionState = resolveInteractionState(dragSession);
  if (interactionState === 'group-candidate' || interactionState === 'merge-candidate') {
    return null;
  }

  if (dragSession.activeNode.kind === 'bigFolder') {
    const centerAnchor = resolveBigFolderCenterAnchor(dragSession.globalPosition, dragSession.gridSpec, dragSession.occupancy);
    return {
      kind: 'big-folder-center',
      centerAnchor,
      valid: deriveBigFolderFootprintFromCenter(centerAnchor, dragSession.gridSpec) !== null,
    };
  }

  return {
    kind: 'cell',
    sequence: resolveSequenceFromPosition(dragSession.globalPosition, dragSession.gridSpec),
    valid: true,
  };
}

export function applyStableInsert<T extends GridNode>(
  nodes: readonly T[],
  activeId: string,
  targetSeq: number,
): T[] {
  const sortedNodes = [...nodes].sort((left, right) => left.sequence - right.sequence);
  const sourceIndex = sortedNodes.findIndex((node) => node.id === activeId);
  if (sourceIndex === -1) {
    return sortedNodes;
  }

  const [activeNode] = sortedNodes.splice(sourceIndex, 1);
  const insertIndex = clamp(targetSeq, 0, sortedNodes.length);
  sortedNodes.splice(insertIndex, 0, activeNode);

  return sortedNodes.map((node, index) => ({
    ...node,
    sequence: index,
  }));
}

export function resolveBigFolderCenterAnchor(
  globalPosition: DragPoint,
  gridSpec: GridSpec,
  occupancy: readonly GridNode[],
): GridCoord {
  const sequence = resolveSequenceFromPosition(globalPosition, gridSpec);
  const coord = sequenceToCoord(sequence, gridSpec.columns);
  const topLeft = {
    row: clamp(coord.row, 0, Math.max(gridSpec.rows - 2, 0)),
    col: clamp(coord.col, 0, Math.max(gridSpec.columns - 2, 0)),
  };

  const fixedBigFolder = occupancy.find((node) => node.kind === 'bigFolder' && node.sequence === coordToSequence(topLeft.row, topLeft.col, gridSpec.columns));
  if (fixedBigFolder) {
    return sequenceToCoord(fixedBigFolder.sequence, gridSpec.columns);
  }

  return topLeft;
}

export function deriveBigFolderFootprintFromCenter(centerAnchor: GridCoord, gridSpec: GridSpec): GridCoord[] | null {
  if (centerAnchor.row < 0 || centerAnchor.col < 0) return null;
  if (centerAnchor.row + 1 >= gridSpec.rows) return null;
  if (centerAnchor.col + 1 >= gridSpec.columns) return null;

  return [
    centerAnchor,
    { row: centerAnchor.row, col: centerAnchor.col + 1 },
    { row: centerAnchor.row + 1, col: centerAnchor.col },
    { row: centerAnchor.row + 1, col: centerAnchor.col + 1 },
  ];
}

export function applyBigFolderBlockInsert<T extends GridNode>(
  nodes: readonly T[],
  bigFolderId: string,
  centerAnchor: GridCoord,
  gridSpec: GridSpec,
): T[] {
  const footprint = deriveBigFolderFootprintFromCenter(centerAnchor, gridSpec);
  if (!footprint) {
    return [...nodes];
  }

  const footprintSequences = new Set(footprint.map((coord) => coordToSequence(coord.row, coord.col, gridSpec.columns)));
  const bigFolder = nodes.find((node) => node.id === bigFolderId);
  if (!bigFolder) {
    return [...nodes];
  }

  const remainingNodes = nodes
    .filter((node) => node.id !== bigFolderId)
    .sort((left, right) => left.sequence - right.sequence)
    .filter((node) => !footprintSequences.has(node.sequence) || isBigFolder(node));
  const insertSequence = Math.min(...footprintSequences);
  const nextNodes = [
    ...remainingNodes,
    {
      ...bigFolder,
      sequence: insertSequence,
    },
  ].sort((left, right) => left.sequence - right.sequence);

  return nextNodes.map((node, index) => ({
    ...node,
    sequence: node.id === bigFolderId ? insertSequence : index >= insertSequence ? index + 3 : index,
  }));
}

export function resolveHighlightTarget(dragSession: DragSession): HighlightTarget | null {
  const interactionState = resolveInteractionState(dragSession);
  if (!dragSession.activeTarget) {
    return null;
  }

  if (interactionState === 'group-candidate') {
    return {
      nodeId: dragSession.activeTarget.nodeId,
      type: 'group',
    };
  }

  if (interactionState === 'merge-candidate') {
    return {
      nodeId: dragSession.activeTarget.nodeId,
      type: 'merge',
    };
  }

  return null;
}

export function resolveShadowPosition(anchorPreview: AnchorPreview | null, gridSpec: GridSpec): DragPoint | null {
  if (!anchorPreview || !anchorPreview.valid) {
    return null;
  }

  if (anchorPreview.kind === 'big-folder-center') {
    return getCellTopLeft(anchorPreview.centerAnchor, gridSpec);
  }

  return getCellTopLeft(sequenceToCoord(anchorPreview.sequence, gridSpec.columns), gridSpec);
}

export function resolveDragSessionOutputs(params: {
  session: DragSessionInput;
  previousActiveTarget?: HoverTarget | null;
}): DragSessionOutputs {
  const { session, previousActiveTarget = null } = params;
  const hoverTarget = resolveHoverTarget(session.globalPosition, session.occupancy, session.gridSpec);
  const activeTarget = resolveActiveTarget(previousActiveTarget, hoverTarget, session);
  const resolvedSession: DragSession = {
    ...session,
    activeTarget,
  };
  const interactionState = resolveInteractionState(resolvedSession);
  const highlightTarget = resolveHighlightTarget(resolvedSession);
  const anchorPreview = resolvePreviewAnchor(resolvedSession);

  return {
    hoverTarget,
    activeTarget,
    interactionState,
    highlightTarget,
    anchorPreview,
    shadowPosition: resolveShadowPosition(anchorPreview, session.gridSpec),
  };
}
