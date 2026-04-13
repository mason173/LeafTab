# AI Handoff

This document summarizes the current state of the Leaftab Grid extraction so another AI can continue work without replaying the whole history.

## Goal

Move Leaftab's shortcut-grid and folder drag engine into the standalone open-source repo `leaftab-grid`, while keeping Leaftab itself as a host app with thin adapters and product-specific visuals.

High-level product focus:

- desktop-style icon grid interactions
- root-grid reorder
- drag into folder
- reorder inside folder
- drag out of folder back to root
- consistent drag motion and settle animation
- support for small and large folders

## Current User Decisions

- Open-source project name: `Leaftab Grid`
- Repository name: `leaftab-grid`
- License: `GPL-3.0-or-later`
- Do not turn this into a generic drag-and-drop framework
- Keep `leaftab-grid` as the single source of truth for grid behavior and engine logic
- Keep `Leaftab` as the host app that supplies policy, visuals, and app-specific wiring
- Consume `leaftab-grid` through versioned GitHub release tarballs by default
- Preserve existing app APIs where possible through thin compatibility adapters

## Repo Context

Main app repo:

- `/Users/mason/Desktop/Leaftab`

Standalone package repo:

- `/Users/mason/Desktop/leaftab-grid`

## What Is Already Done In `leaftab-grid`

### `@leaftab/grid-core`

This package is already real and validated.

Included areas:

- shortcut tree types needed by the package
- model selectors and mutations
- constraints for the currently supported tree shape
- unified drop-intent application
- pointer drag math
- drag-motion helpers
- drop-edge math
- grid layout packing
- root drop-intent resolution
- package-local tests

Validation already completed successfully:

- `npm run typecheck`
- `npm run test`
- `npm run build`

### `@leaftab/grid-react`

This package is no longer just primitives. It now contains real React adapters.

Important exported files:

- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/index.ts`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/RootShortcutGrid.tsx`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/FolderShortcutSurface.tsx`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/rootShortcutGridHelpers.ts`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/rootShortcutGridHelpers.test.ts`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/GridDragItemFrame.tsx`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/useDragMotionState.ts`

What this means now:

- the root-grid behavior adapter exists in the standalone package
- the folder-surface behavior adapter exists in the standalone package
- Leaftab no longer needs to keep full in-app copies of those behavior layers

Current note:

- the standalone repo is published at `mason173/leaftab-grid`
- release tag `v0.1.0` contains public tarballs for `@leaftab/grid-core` and `@leaftab/grid-react`

## What Is Already Done In `Leaftab`

### Published package consumption is wired

`Leaftab` now consumes the standalone packages through versioned GitHub release tarballs:

- `@leaftab/grid-core: https://github.com/mason173/leaftab-grid/releases/download/v0.1.0/leaftab-grid-core-0.1.0.tgz`
- `@leaftab/grid-react: https://github.com/mason173/leaftab-grid/releases/download/v0.1.0/leaftab-grid-react-0.1.0.tgz`

Relevant file:

- `/Users/mason/Desktop/Leaftab/package.json`

Build scripts now verify the grid dependency source first:

- `grid:build:local`
- `grid:prepare`
- `grid:check:local`
- `grid:check:published`
- `grid:check:boundaries`
- `grid:verify:host`
- `dev`
- `build:community`
- `build:store`

This is intentional. It means Leaftab now behaves like a host app consuming the extracted grid package through a versioned published source by default, while still allowing optional local co-development when you explicitly switch back.

New guardrail behavior:

- `grid:prepare` detects whether the grid packages are local `file:` dependencies or published versions
- if local dependencies are active, `grid:prepare` builds the standalone `leaftab-grid` workspace automatically before host builds
- `grid:check:boundaries` verifies that Leaftab host adapters still point at `@leaftab/grid-react` and that the old `ShortcutGrid.tsx` compatibility file remains thin
- `dev`, `build:community`, and `build:store` now go through `grid:verify:host` first

### App adapters are now thin

Important files:

- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/components/RootShortcutGrid.tsx`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/components/FolderShortcutSurface.tsx`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/components/leaftabGridVisuals.tsx`
- `/Users/mason/Desktop/Leaftab/src/components/ShortcutGrid.tsx`

Current structure:

- `RootShortcutGrid.tsx` wraps `@leaftab/grid-react` and maps Leaftab host policy into package props
- `FolderShortcutSurface.tsx` wraps `@leaftab/grid-react` and maps Leaftab host policy into package props
- `leaftabGridVisuals.tsx` holds Leaftab-specific rendering defaults and layout helpers
- `ShortcutGrid.tsx` is now a compatibility layer that forwards to `RootShortcutGrid`

This is the intended direction:

- package repo owns behavior
- app repo owns visuals and host integration

### Validation completed in `Leaftab`

The acceptance check to trust here is:

- `npm run build:community`

This build now passes with the published tarball wiring and the thinner adapters.

Important constraint:

- full `tsc --noEmit` is not a reliable acceptance check for this repo because there are unrelated pre-existing type errors elsewhere in the worktree

## Source Of Truth Workflow

This is the most important rule to preserve:

> one source of truth, one direction of change

Current rule:

- grid behavior, drag rules, layout logic, and reusable React adapters belong in `/Users/mason/Desktop/leaftab-grid`
- Leaftab should only keep host-specific adapters, visuals, app policy, dialogs, persistence wiring, and compatibility shims

### When to change `leaftab-grid`

Make changes in the standalone repo first when the change affects:

- drag behavior
- reorder or merge rules
- folder extraction logic
- grid measurement or layout behavior
- package-level React adapters
- reusable helper logic that another host app could consume

Typical files:

- `/Users/mason/Desktop/leaftab-grid/packages/grid-core/src/**`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/**`

### When to change `Leaftab`

Keep changes in the app repo when the change affects:

- shortcut card visuals
- text style or icon style
- context menus
- merge dialogs
- toasts
- app persistence
- scenario state
- compatibility wrappers for existing in-app imports

Typical files:

- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/components/leaftabGridVisuals.tsx`
- `/Users/mason/Desktop/Leaftab/src/App.tsx`
- other app-level UI and state files

### Safe workflow for future changes

If you are improving the grid engine itself:

1. Edit `../leaftab-grid` first
2. Run `cd /Users/mason/Desktop/leaftab-grid && npm run verify`
3. Publish a new GitHub release tarball version from `leaftab-grid`
4. Bump the dependency URLs in `Leaftab/package.json`
5. Run `npm install`
6. Run `npm run build:community`
7. Adjust only the thin host adapters if package props changed

If you are only changing Leaftab-specific visuals or policy:

1. Edit `Leaftab` only
2. Keep the package interfaces stable if possible
3. Run `npm run build:community`

### What to avoid

Do not do these:

- do not re-implement grid engine fixes separately in both repos
- do not add new drag behavior directly into Leaftab if it belongs in the package
- do not let `Leaftab` adapters grow back into full engine copies
- do not treat `ShortcutGrid.tsx` as the primary place for new grid behavior

## Current Risks And Constraints

- `Leaftab` is a dirty worktree with unrelated user changes; do not revert unrelated files
- `snapshot/` in `leaftab-grid` is still useful as an extraction reference, so do not remove it yet
- nested folders are still outside the intended public contract

## Most Useful Files To Read First

In `leaftab-grid`:

- `/Users/mason/Desktop/leaftab-grid/README.md`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-core/src/index.ts`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/index.ts`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/RootShortcutGrid.tsx`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/FolderShortcutSurface.tsx`

In `Leaftab`:

- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/components/RootShortcutGrid.tsx`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/components/FolderShortcutSurface.tsx`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/components/leaftabGridVisuals.tsx`
- `/Users/mason/Desktop/Leaftab/src/components/ShortcutGrid.tsx`
- `/Users/mason/Desktop/Leaftab/package.json`

## Recommended Next Step

The highest-value next step after this handoff is:

- keep shrinking Leaftab adapters so they stay focused on host policy and visuals only

Good next candidates:

1. Move any remaining reusable root or folder behavior helpers into `@leaftab/grid-react`
2. Keep Leaftab rendering defaults grouped in `leaftabGridVisuals.tsx`
3. Add a short development workflow section in `leaftab-grid` docs so contributors know where engine fixes should land first

## Short State Summary

If another AI needs the shortest possible summary:

- `leaftab-grid` now contains real `grid-core` and `grid-react` packages
- `grid-react` now includes `RootShortcutGrid` and `FolderShortcutSurface`
- `Leaftab` now consumes those packages through versioned GitHub release tarballs
- `Leaftab` root and folder grid files are now thin host adapters instead of full engine implementations
- `npm run build:community` passes in `Leaftab`
- future engine work should go into `../leaftab-grid` first to avoid the two repos drifting apart
