# Leaftab Grid Migration Map

This document maps the current Leaftab files into the future standalone `leaftab-grid` repository.

The goal is not to move everything at once. The goal is to move the right boundary in the right order.

## Migration rule

Use this rule when deciding whether a file belongs in `Leaftab Grid`:

- if it expresses grid behavior, drag behavior, folder behavior, layout behavior, or reusable React adapters for that system, it belongs in `Leaftab Grid`
- if it expresses Leaftab product UI, sync, scenarios, app navigation, toasts, dialogs, or branding, it stays in `Leaftab`

## Ready to move now

These files are already very close to standalone package code.

### Move to `@leaftab/grid-core`

- `src/features/shortcuts/drag/types.ts`
- `src/features/shortcuts/drag/gridLayout.ts`
- `src/features/shortcuts/drag/gridDragEngine.ts`
- `src/features/shortcuts/drag/dropEdge.ts`
- `src/features/shortcuts/drag/resolveRootDropIntent.ts`
- `src/features/shortcuts/drag/compactRootDrag.ts`
- `src/features/shortcuts/drag/pointerDragSession.ts`
- `src/features/shortcuts/drag/dragMotion.ts`
- `src/features/shortcuts/model/types.ts`
- `src/features/shortcuts/model/paths.ts`
- `src/features/shortcuts/model/selectors.ts`
- `src/features/shortcuts/model/operations.ts`
- `src/features/shortcuts/model/constraints.ts`
- `src/features/shortcuts/domain/dropIntents.ts`

### Move to `@leaftab/grid-react`

- `src/features/shortcuts/drag/useDragMotionState.ts`

These are already mostly free of Leaftab app policy and are the cleanest first extraction boundary.

## Move next, with light dependency cleanup

These files belong in `grid-react`, but still depend on Leaftab UI primitives or app-local types.

### `src/features/shortcuts/components/DraggableShortcutItemFrame.tsx`

Belongs in:

- `packages/grid-react/src/components/DraggableShortcutItemFrame.tsx`

Current cleanup needed:

- replace imports from `@/components/shortcuts/shortcutCardVariant`
- replace imports from `@/utils/shortcutIconSettings`
- keep only generic frame/placeholder behavior in the package

Recommended split:

- keep the frame container in `grid-react`
- move Leaftab-specific visual styling helpers into thin local adapters if needed

### `src/features/shortcuts/components/FolderShortcutSurface.tsx`

Belongs in:

- `packages/grid-react/src/components/FolderShortcutSurface.tsx`

Current cleanup needed:

- decouple from Leaftab card components:
  - `ShortcutCardCompact`
  - `ShortcutIconRenderContext`
- decouple from Leaftab layout helpers:
  - `compactFolderLayout`
  - `ShortcutFolderPreview`
  - `shortcutIconSettings`
- keep drag lifecycle and folder-grid behavior inside the package

Recommended extraction shape:

- keep `FolderShortcutSurface` as a behavior adapter
- inject item rendering through props or render callbacks

## Move last, after adapter extraction

### `src/components/ShortcutGrid.tsx`

This file absolutely belongs to `Leaftab Grid`, but not as-is.

Belongs in:

- `packages/grid-react/src/components/RootShortcutGrid.tsx`

Why it is not a direct copy yet:

- it imports Leaftab rendering components:
  - `ShortcutCardRenderer`
  - `shortcutCardVariant`
  - `ShortcutIconRenderContext`
  - `RiCheckFill`
- it uses Leaftab-specific compact card metrics and preview rendering
- it mixes grid engine behavior with Leaftab presentation concerns

Recent progress:

- the root grid now supports injected card rendering
- the root grid now supports injected drag preview rendering
- the root grid now supports injected selection-indicator rendering

That means the behavior shell is now closer to a package adapter and no longer hardcodes every Leaftab visual decision.

Recommended extraction strategy:

1. extract the behavior shell as `RootShortcutGrid`
2. replace hardcoded card rendering with render props
3. keep selection indicators and Leaftab-only visuals in the app adapter layer

## Should stay in Leaftab

These files are not part of the first standalone grid package.

- `src/App.tsx`
- `src/components/ShortcutFolderDialog.tsx`
- `src/components/ShortcutFolderCompactOverlay.tsx`
- `src/components/shortcuts/ShortcutCardRenderer.tsx`
- `src/components/shortcuts/ShortcutCardCompact.tsx`
- `src/components/shortcuts/ShortcutCardDefault.tsx`
- `src/components/ShortcutIconRenderContext.tsx`
- sync-related files
- wallpaper-related files
- scenario management
- toast/dialog orchestration

They may consume `Leaftab Grid`, but they should not define its public contract.

## Temporary dependency bridge

For the first standalone release, it is acceptable to keep a small bridge layer if needed.

Examples:

- package-local `ShortcutLike` type before fully separating from `src/types.ts`
- package-local `renderShortcut` props rather than exporting Leaftab card components
- host-provided border-radius and metric helpers

This is better than publishing app-specific visual code as part of the core package.

## Best extraction order

### Phase 1: publishable core

Move first:

- `model/*`
- `domain/dropIntents.ts`
- pure drag helpers in `drag/*`
- tests for those modules

This gives you a real `@leaftab/grid-core`.

### Phase 2: shared React primitives

Move next:

- `useDragMotionState.ts`
- `DraggableShortcutItemFrame.tsx`
- `FolderShortcutSurface.tsx`

This gives you an early `@leaftab/grid-react`.

### Phase 3: root grid adapter

Move last:

- behavior shell extracted from `ShortcutGrid.tsx`

This is the only part that still needs a deliberate adapter split before it becomes clean package code.

## Practical repo-sync guidance

If you open the standalone repo now, the best working pattern is:

1. make grid behavior changes in this Leaftab repo first
2. keep the files in this migration map as the sync boundary
3. mirror those files into `leaftab-grid`
4. once the standalone package matures, you can invert the source-of-truth relationship later if you want

Do not hand-maintain two drifting implementations.

## Minimum standalone demo target

The first standalone demo only needs to prove five things:

- reorder in the root grid
- merge into a folder
- move into an existing folder
- reorder inside a folder
- extract from a folder back to root

If those five interactions are working, `Leaftab Grid` already demonstrates its core differentiator.
