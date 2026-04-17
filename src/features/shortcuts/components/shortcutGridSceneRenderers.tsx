import React from 'react';
import type {
  FolderGridSceneProps,
  RootGridSceneProps,
} from './shortcutGridSceneAdapters';

function renderScenePrimaryNodes(params: {
  projectedDropPreviewNode: React.ReactNode;
  itemNodes: React.ReactNode;
}) {
  return (
    <>
      {params.projectedDropPreviewNode}
      {params.itemNodes}
    </>
  );
}

function renderGridScene({
  wrapperRef,
  wrapperClassName,
  rootRef,
  beforeRootNode,
  projectedDropPreviewNode,
  itemNodes,
  insideRootTrailingNode,
  afterRootNode,
  rootClassName,
  rootStyle,
  rootProps,
}: RootGridSceneProps | FolderGridSceneProps) {
  return (
    <div ref={wrapperRef} className={wrapperClassName}>
      {beforeRootNode}
      <div
        ref={rootRef}
        className={rootClassName}
        style={rootStyle}
        {...rootProps}
      >
        {renderScenePrimaryNodes({
          projectedDropPreviewNode,
          itemNodes,
        })}
        {insideRootTrailingNode}
      </div>
      {afterRootNode}
    </div>
  );
}

export function RootGridScene(props: RootGridSceneProps) {
  return renderGridScene(props);
}

export function FolderGridScene(props: FolderGridSceneProps) {
  return renderGridScene(props);
}
