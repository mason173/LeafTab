# Leaftab Grid First Public Exports

These are recommended `src/index.ts` templates for the first standalone release.

## `packages/grid-core/src/index.ts`

```ts
export * from './drag/types';
export * from './drag/gridLayout';
export * from './drag/dropEdge';
export * from './drag/gridDragEngine';
export * from './drag/resolveRootDropIntent';
export * from './drag/compactRootDrag';
export * from './drag/pointerDragSession';
export * from './drag/dragMotion';
export * from './model/types';
export * from './model/paths';
export * from './model/selectors';
export * from './model/operations';
export * from './model/constraints';
export * from './domain/dropIntents';
```

## `packages/grid-react/src/index.ts`

```ts
export * from './drag/useDragMotionState';
export * from './components/DraggableShortcutItemFrame';
export * from './components/FolderShortcutSurface';
export * from './components/RootShortcutGrid';
```

## Why keep it this small

- it gives users the core layout and interaction engine immediately
- it avoids overcommitting to unstable internal helpers
- it leaves room to rename or regroup lower-level modules before `1.0`
