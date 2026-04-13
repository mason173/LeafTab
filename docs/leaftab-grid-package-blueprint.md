# Leaftab Grid Package Blueprint

This document defines the first publishable package surface for the standalone `leaftab-grid` repository.

## Recommended repo layout

```text
leaftab-grid/
  LICENSE
  README.md
  package.json
  tsconfig.base.json
  packages/
    grid-core/
      package.json
      tsconfig.json
      src/
        index.ts
    grid-react/
      package.json
      tsconfig.json
      src/
        index.ts
  examples/
    basic-react-demo/
```

## Root package role

The root package should be private and only coordinate workspaces, scripts, and shared tooling.

Suggested responsibilities:

- workspace management
- shared TypeScript base config
- shared test config
- release scripts

## `@leaftab/grid-core`

### What it should export first

- drag/session types
- folder extract payload types
- grid layout helpers
- root drop intent resolution
- compact root hover resolution helpers
- pointer drag session helpers
- drag motion math helpers
- folder depth constraints
- shortcut selectors and model operations
- domain drop application outcomes

### Suggested first public export map

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

### Files to move into `grid-core`

- `src/features/shortcuts/domain/dropIntents.ts`
- `src/features/shortcuts/drag/compactRootDrag.ts`
- `src/features/shortcuts/drag/dragMotion.ts`
- `src/features/shortcuts/drag/dropEdge.ts`
- `src/features/shortcuts/drag/gridDragEngine.ts`
- `src/features/shortcuts/drag/gridLayout.ts`
- `src/features/shortcuts/drag/pointerDragSession.ts`
- `src/features/shortcuts/drag/resolveRootDropIntent.ts`
- `src/features/shortcuts/drag/types.ts`
- `src/features/shortcuts/model/constraints.ts`
- `src/features/shortcuts/model/operations.ts`
- `src/features/shortcuts/model/paths.ts`
- `src/features/shortcuts/model/selectors.ts`
- `src/features/shortcuts/model/types.ts`

## `@leaftab/grid-react`

### What it should export first

- `useDragMotionState`
- `DraggableShortcutItemFrame`
- `FolderShortcutSurface`
- a root grid surface extracted from `ShortcutGrid.tsx`

### Suggested first public export map

```ts
export * from './drag/useDragMotionState';
export * from './components/DraggableShortcutItemFrame';
export * from './components/FolderShortcutSurface';
export * from './components/RootShortcutGrid';
```

### Files to move into `grid-react`

- `src/features/shortcuts/drag/useDragMotionState.ts`
- `src/features/shortcuts/components/DraggableShortcutItemFrame.tsx`
- `src/features/shortcuts/components/FolderShortcutSurface.tsx`
- extracted grid surface from `src/components/ShortcutGrid.tsx`

## Dependencies

### `grid-core`

Keep this package as close to pure TypeScript as possible.

Expected runtime deps:

- none, if all shortcut types are moved into the package

If React app types are still shared temporarily, keep that as a migration step only.

### `grid-react`

Expected peer deps:

- `react`
- `react-dom`

Expected direct deps:

- ideally none beyond `grid-core`

If some UI rendering primitives stay package-local at first, add them intentionally instead of leaking app dependencies.

## First release rules

- Do not expose Leaftab app state management.
- Do not expose toast or dialog APIs.
- Do not promise nested folder support.
- Do not export every internal helper by default.

## Publish strategy

Use a small initial surface and grow it later.

A good versioning policy:

- `0.x` while the API is still settling
- `1.0` only after the root grid and folder grid APIs feel stable

## Recommended first tags

- `@leaftab/grid-core@0.1.0`
- `@leaftab/grid-react@0.1.0`
