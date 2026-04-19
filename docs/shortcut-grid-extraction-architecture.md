# Shortcut Grid Extraction Architecture

This project already has most of the logic needed to split the shortcut grid into an open-source package. The next step is not a rewrite. The goal is to tighten module boundaries so the drag rules, layout rules, and tree operations can move without bringing the whole app with them.

## Current split

- `src/features/shortcuts/model/*`
  Pure tree selectors and mutations for shortcuts and folders.
- `src/features/shortcuts/drag/*`
  Pointer hit-testing, reorder intent resolution, compact-grid hover rules, and projection logic.
- `src/components/ShortcutGrid.tsx`
  Root-grid DOM measurement, pointer lifecycle, auto-scroll, visual projection, and animation orchestration.
- `src/features/shortcuts/components/FolderShortcutSurface.tsx`
  Host composition wrapper for folder-opened presentation and app-only bindings.
- `src/App.tsx`
  Product-level policy and UI effects such as merge dialogs, toasts, and scenario state writes.

At the package layer, folder-opened drag is no longer implemented as a second dedicated engine.
`packages/grid-react/src/FolderShortcutSurface.tsx` is now a thin adapter over `RootShortcutGrid` plus a folder interaction profile.

## Target split

- `shortcut-domain`
  Tree types, selectors, mutations, and pure drop-application functions.
- `shortcut-dnd-core`
  Layout packing, hit regions, drag intent resolution, projection math, and drag session helpers.
- `shortcut-react`
  React adapters that measure DOM, bind pointer events, and render previews and animations.
- `leaftab-app`
  Dialogs, persistence, toasts, scenario switching, and other app-only workflows.

## What was tightened first

The first extraction seam is now the drop-application layer:

- `src/features/shortcuts/domain/dropIntents.ts`

This module keeps UI decisions out of the drag engine and keeps tree mutations out of `App.tsx`.

It currently owns:

- applying root reorder intents
- applying root move-into-folder intents
- converting root merge intents into a pure "request folder merge" outcome
- applying folder reorder intents
- applying folder extract intents

The second seam is shared drag-session math:

- `src/features/shortcuts/drag/pointerDragSession.ts`

It currently owns:

- the shared pointer-drag activation threshold
- preview-offset calculation from DOM rects and pointer positions
- preview-offset reconstruction from normalized anchors
- normalized anchor reconstruction from active drag offsets

The third seam is shared drag-motion orchestration:

- `src/features/shortcuts/drag/dragMotion.ts`
- `src/features/shortcuts/drag/useDragMotionState.ts`

They currently own:

- shared DOM rect measurement for drag items
- shared FLIP layout-shift offset calculation and composition
- shared release-settle preview lifecycle used after pointer release
- shared animation state that both the root grid and folder grid can consume

The fourth seam is shared grid layout packing:

- `src/features/shortcuts/drag/gridLayout.ts`

It currently owns:

- span-aware grid packing for root shortcuts
- projected rect calculation for packed items
- the layout math that used to live directly inside `ShortcutGrid.tsx`

The fifth seam is one shared interaction outcome model:

- `src/features/shortcuts/domain/dropIntents.ts`

It now owns one domain-level outcome shape for:

- root-grid reorder and move outcomes
- root-grid merge requests
- folder-grid reorder outcomes
- folder extract handoff back into the root drag surface

The sixth seam is explicit tree-shape constraints:

- `src/features/shortcuts/model/constraints.ts`

It currently makes one product boundary explicit:

- the open-source shortcut grid currently guarantees only two levels:
  root shortcuts plus one folder child level
- nested folders are treated as unsupported structure for these drag/drop domain entrypoints

## Why this seam matters

Without this layer, the future open-source package would have to copy logic from:

- `ShortcutGrid.tsx`
- `FolderShortcutSurface.tsx`
- `App.tsx`

That would make the package depend on Leaftab-specific state and dialog behavior. With a pure drop-application module in place, the package can expose outcomes and let each host app decide how to present merge naming, persistence, and notifications.

## Recommended next steps

1. Add package-style public entrypoints before moving files across repositories.
2. Keep `ShortcutGrid.tsx` and `FolderShortcutSurface.tsx` thin as app-local adapters, or publish only equally thin React adapters with the package.
3. If nested folders are ever needed, treat that as a new feature line rather than extending the current open-source contract implicitly.
