import React from 'react';
import type {
  FolderGridSceneProps,
  RootGridSceneProps,
} from './shortcutGridSceneAdapters';

export function RootGridScene(props: RootGridSceneProps) {
  return (
    <div ref={props.wrapperRef} className={props.wrapperClassName}>
      {props.beforeRootNode}
      <div
        ref={props.rootRef}
        className={props.rootClassName}
        style={props.rootStyle}
        {...props.rootProps}
      >
        {props.projectedDropPreviewNode}
        {props.itemNodes}
        {props.insideRootTrailingNode}
      </div>
      {props.afterRootNode}
    </div>
  );
}

export function FolderGridScene(props: FolderGridSceneProps) {
  return (
    <div ref={props.wrapperRef} className={props.wrapperClassName}>
      {props.beforeRootNode}
      <div
        ref={props.rootRef}
        className={props.rootClassName}
        style={props.rootStyle}
        {...props.rootProps}
      >
        {props.projectedDropPreviewNode}
        {props.itemNodes}
        {props.insideRootTrailingNode}
      </div>
      {props.afterRootNode}
    </div>
  );
}
