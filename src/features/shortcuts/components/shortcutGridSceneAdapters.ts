import type React from 'react';

type SharedSceneRefs = {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  rootRef: React.RefObject<HTMLDivElement | null>;
};

type SharedScenePrimaryContent = {
  projectedDropPreviewNode: React.ReactNode;
  itemNodes: React.ReactNode;
};

type SceneRootProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'ref'> & Record<string, unknown>;

type SharedSceneShellLayout = {
  wrapperClassName?: string;
  beforeRootNode?: React.ReactNode;
  insideRootTrailingNode?: React.ReactNode;
  afterRootNode?: React.ReactNode;
  rootClassName: string;
  rootStyle?: React.CSSProperties;
  rootProps?: SceneRootProps;
};

function buildSharedScenePrimaryContent(
  params: SharedScenePrimaryContent,
) {
  return params;
}

function buildSceneOverlayNodes(
  nodes: React.ReactNode[],
): React.ReactNode {
  return nodes;
}

function buildShortcutGridSceneProps(params: SharedSceneRefs & SharedScenePrimaryContent & SharedSceneShellLayout) {
  return {
    ...params,
    ...buildSharedScenePrimaryContent({
      projectedDropPreviewNode: params.projectedDropPreviewNode,
      itemNodes: params.itemNodes,
    }),
  };
}

export type ShortcutGridSceneProps = SharedSceneRefs & SharedScenePrimaryContent & SharedSceneShellLayout;

export type RootGridSceneProps = ShortcutGridSceneProps;

export type FolderGridSceneProps = ShortcutGridSceneProps;

export function buildRootGridContainerStyle(params: {
  containerHeight: number;
  bottomInset: number;
  gridMinHeight: number;
}): React.CSSProperties {
  const height = Math.max(params.containerHeight - params.bottomInset, params.gridMinHeight);
  return {
    minHeight: height,
    height,
  };
}

export function buildRootGridSceneProps(params: {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  rootRef: React.RefObject<HTMLDivElement | null>;
  containerHeight: number;
  bottomInset: number;
  gridMinHeight: number;
  onContextMenu: React.MouseEventHandler<HTMLDivElement>;
  projectedDropPreviewNode: React.ReactNode;
  itemNodes: React.ReactNode;
  dragPreviewOverlayNode: React.ReactNode;
}): RootGridSceneProps {
  return buildShortcutGridSceneProps({
    wrapperRef: params.wrapperRef,
    rootRef: params.rootRef,
    wrapperClassName: 'w-full',
    rootClassName: 'relative w-full',
    rootStyle: buildRootGridContainerStyle({
      containerHeight: params.containerHeight,
      bottomInset: params.bottomInset,
      gridMinHeight: params.gridMinHeight,
    }),
    rootProps: {
      onContextMenu: params.onContextMenu,
    },
    projectedDropPreviewNode: params.projectedDropPreviewNode,
    itemNodes: params.itemNodes,
    insideRootTrailingNode: params.dragPreviewOverlayNode,
  });
}

export function buildFolderGridStyle(columns: number): React.CSSProperties {
  return {
    gridTemplateColumns: `repeat(${Math.max(columns, 1)}, minmax(0, 1fr))`,
    columnGap: '16px',
    rowGap: '20px',
  };
}

export function buildFolderGridSettleTransition(params: {
  enabled: boolean;
  settleDurationMs: number;
}): string | undefined {
  if (!params.enabled) {
    return undefined;
  }

  return `transform ${params.settleDurationMs}ms ease-out`;
}

export function buildFolderGridSceneProps(params: {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  rootRef: React.RefObject<HTMLDivElement | null>;
  maskOverlayNode?: React.ReactNode;
  columns: number;
  projectedDropPreviewNode: React.ReactNode;
  itemNodes: React.ReactNode;
  dragPreviewOverlayNode: React.ReactNode;
  settlingDragPreviewOverlayNode: React.ReactNode;
}): FolderGridSceneProps {
  return buildShortcutGridSceneProps({
    wrapperRef: params.wrapperRef,
    rootRef: params.rootRef,
    beforeRootNode: params.maskOverlayNode,
    rootClassName: 'relative grid',
    rootStyle: buildFolderGridStyle(params.columns),
    rootProps: {
      'data-folder-shortcut-grid': true,
    },
    projectedDropPreviewNode: params.projectedDropPreviewNode,
    itemNodes: params.itemNodes,
    afterRootNode: buildSceneOverlayNodes([
      params.dragPreviewOverlayNode,
      params.settlingDragPreviewOverlayNode,
    ]),
  });
}
