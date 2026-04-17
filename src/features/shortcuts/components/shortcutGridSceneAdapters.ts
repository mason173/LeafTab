import type React from 'react';

type SceneRefs = {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  rootRef: React.RefObject<HTMLDivElement | null>;
};

type ScenePrimaryContent = {
  projectedDropPreviewNode: React.ReactNode;
  itemNodes: React.ReactNode;
};

type SceneRootProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'ref'> & Record<string, unknown>;

type SceneShellLayout = {
  wrapperClassName?: string;
  beforeRootNode?: React.ReactNode;
  insideRootTrailingNode?: React.ReactNode;
  afterRootNode?: React.ReactNode;
  rootClassName: string;
  rootStyle?: React.CSSProperties;
  rootProps?: SceneRootProps;
};

export type RootGridSceneProps = SceneRefs & ScenePrimaryContent & SceneShellLayout;

export type FolderGridSceneProps = SceneRefs & ScenePrimaryContent & SceneShellLayout;

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
