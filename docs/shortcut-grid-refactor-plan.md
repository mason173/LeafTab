# Shortcut Grid Refactor Plan

## Goal

Refactor the shared shortcut-grid engine so it can evolve toward a sequence-first, world-coordinate-driven drag system without forcing a risky one-shot rewrite.

## Current Status

- Phase 1 is complete in this branch:
  - explicit world-coordinate helpers are in `grid-core`
  - root and folder hover resolution now consume `globalPosition`
  - `bigFolderMergeHitArea` is separated from normal `1x1` `A`-region semantics
  - sticky reorder can yield back to merge when re-entering from the allowed merge side
- Phase 2 is now complete in this branch:
  - shared serpentine `sequence <-> coord` helpers live in `grid-core`
  - world-grid helpers derive cells from `globalPosition`
  - center-based `2x2` big-folder footprint mapping is explicit and tested
- Phase 3 is now complete in this branch:
  - explicit stable-insert helpers live in `grid-core`
  - big-folder block insert collects conflicts by ascending sequence
  - drop-intent application can distinguish stable insert from explicit big-folder block insert
- Phase 4 is now complete in this branch:
  - shared drag modes are explicit: `normal`, `reorder-only`, `external-insert`
  - root intent candidates now distinguish `reorder-candidate`, `group-candidate`, and `merge-into-big-folder-candidate`
  - root-side resolver entrypoints can disable center intents by mode instead of relying on scattered local conditionals
- React-side hover branching now routes mode-scoped reorder slot selection through shared compact hover helpers instead of local per-branch intent picking
- Phase 5 is complete for the current refactor scope:
  - docs now describe world coordinates, explicit drag modes, candidate semantics, and large-folder hit-area behavior
  - shared regression suites cover serpentine mapping, world coordinates, stable insert, big-folder block insert, and compact hover mode transitions

This plan is intentionally phased. The current execution scope for this round is:

1. add explicit world-coordinate helpers
2. separate `bigFolderMergeHitArea` from normal `A`-region semantics
3. route root and folder drag hover resolution through `globalPosition`
4. add tests around the new shared helpers and hit-area behavior

## Locked Rules

- Reorder semantics always use `remove + insert + stable shift`.
- `swap` is never allowed, even when the UI looks like a visual exchange.
- Z-order uses `0-based` rows:
  `row % 2 === 0 -> left-to-right`
  `row % 2 === 1 -> right-to-left`
- Normal `1x1` nodes use `A`-region hit testing.
- Normal icons entering a `bigFolder` use `bigFolderMergeHitArea`, not normal `A`-region semantics.
- `bigFolderAnchorPolicy = "center"`.
- The center anchor is a logical anchor that must map a stable `globalPosition + gridSpec` to a unique `2x2` footprint.
- Auto-scroll only changes `viewport` and `scrollOffset`.
- Auto-scroll must not mutate `sequence` or the grid world coordinate system.

## Phases

### Phase 1: Shared Geometry And Hover Baseline

Files:

- `packages/grid-core/src/drag/worldCoordinates.ts`
- `packages/grid-core/src/index.ts`
- `packages/grid-react/src/compactRootHover.ts`
- `packages/grid-react/src/RootShortcutGrid.tsx`
- `packages/grid-react/src/FolderShortcutSurface.tsx`
- `packages/grid-preset-leaftab/src/layout.ts`

Deliverables:

- explicit `globalPosition = mousePosition + scrollOffset` helpers
- optional `bigFolderMergeHitArea` in compact target-region data
- root/folder hover resolution using global coordinates instead of viewport-only math
- tests for the new helpers and big-folder hit-area path

Exit criteria:

- auto-scroll-aware hover logic consumes global coordinates
- `bigFolder` merge hit testing no longer depends on the normal `A`-region field
- current tests remain green after wiring changes

### Phase 2: Sequence-First Core Utilities

Files:

- `packages/grid-core/src/drag/serpentineGrid.ts`
- `packages/grid-core/src/drag/gridLayout.ts`
- `packages/grid-core/src/drag/types.ts`
- `packages/grid-core/src/drag/__tests__/gridLayout.test.ts`

Deliverables:

- serpentine `sequence <-> coord` mapping helpers
- world-grid helpers for deriving cells and anchors from `globalPosition`
- non-DOM anchor math that can later drive root and folder placement

Exit criteria:

- sequence helpers are deterministic and tested
- the codebase has one shared source of truth for serpentine mapping

### Phase 3: Stable Insert And Big Folder Block Insert

Files:

- `packages/grid-core/src/model/operations.ts`
- `packages/grid-core/src/model/__tests__/operations.test.ts`
- `packages/grid-core/src/domain/dropIntents.ts`
- `packages/grid-core/src/domain/__tests__/dropIntents.test.ts`

Deliverables:

- explicit stable-insert helpers
- `bigFolder` block-insert operation based on sequence-ordered conflict collection
- drop-intent application paths that can distinguish normal stable insert from big-folder block insert

Exit criteria:

- conflict nodes for `bigFolder` insertion are collected by ascending sequence
- no path depends on DOM order or screen geometry order for insert semantics

### Phase 4: Mode-Aware Intent Resolver Cleanup

Files:

- `packages/grid-core/src/drag/resolveRootDropIntent.ts`
- `packages/grid-react/src/compactRootHover.ts`
- `packages/grid-react/src/RootShortcutGrid.tsx`
- `packages/grid-react/src/FolderShortcutSurface.tsx`

Deliverables:

- explicit `reorder-candidate`, `group-candidate`, and `merge-into-big-folder-candidate` semantics
- clearer separation between `Normal`, `Reorder-only`, and `External-Insert`
- reduced coupling between render geometry and commit semantics

Exit criteria:

- normal and reorder-only behaviors are enforced by mode, not scattered conditionals
- extracted drags remain reorder-only until commit

### Phase 5: Contract And Regression Coverage

Files:

- `docs/compact-grid-rules.md`
- shared package test suites
- host drag integration tests

Deliverables:

- updated grid behavior contract
- regression coverage for auto-scroll, block insert, folder extraction, and candidate-state transitions

Exit criteria:

- docs match implementation
- shared tests protect the new invariants

## Execution Order

Completed in this branch:

1. finish Phase 1 end-to-end
2. run focused package tests
3. start Phase 2 only after Phase 1 is green
4. move to Phase 3 once sequence helpers are stable
5. collapse root hover mode branching onto shared helpers
6. realign docs with the final compact-grid contract and rerun package regression suites

## Notes

- The host wrappers under `src/features/shortcuts/components` stay thin.
- Behavior changes belong in `packages/`.
- Large architectural changes should be introduced behind tests first, then adopted by React adapters.
