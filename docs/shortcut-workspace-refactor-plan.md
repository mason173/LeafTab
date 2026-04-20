# Shortcut Workspace Refactor Plan

## Purpose

This document tracks the incremental refactor of the shortcut workspace system:

- root shortcut grid
- folder overlay and folder-internal grid
- drag and reorder coordination
- shortcut domain state
- local persistence and cloud sync boundaries

The goal is to reduce architecture coupling without changing user-facing behavior in the first phase.

## Why We Are Doing This

The current implementation works, but several responsibilities are coupled too tightly:

- shortcut domain data, sync, and UI modal state are all mixed inside [`src/hooks/useShortcuts.ts`](../src/hooks/useShortcuts.ts)
- drag orchestration and intermediate drag state are coordinated in [`src/App.tsx`](../src/App.tsx)
- drawer behavior and drag behavior are linked through container-level coordination

This is not an emergency rewrite. It is a controlled cleanup intended to make future shortcut and drag work safer and cheaper.

## Non-Goals

These items are explicitly out of scope for the initial phase:

- changing the visual design of the shortcut area
- changing drag behavior or drop semantics
- rewriting the grid engine
- replacing drawer auto-scroll or synthetic pointer forwarding
- broad file moves unrelated to shortcut architecture

## Guiding Principles

1. Preserve current behavior in phase 1.
2. Prefer small PRs over a single large refactor.
3. Keep existing external APIs stable until the new boundaries are proven.
4. Separate domain state, persistence/sync, and UI state before changing drag orchestration.
5. Update this document after each completed step.

## Phase Overview

### Phase 1: Low-Risk Boundary Split

Objective:
Split shortcut domain state, persistence/sync state, and UI state while keeping the current app integration stable.

Planned outputs:

- `src/features/shortcuts/model/useShortcutStore.ts`
- `src/features/shortcuts/model/useShortcutPersistenceSync.ts`
- `src/features/shortcuts/model/useShortcutUiState.ts`
- `src/features/shortcuts/model/types.ts`

Expected result:

- `useShortcuts()` remains as a compatibility facade
- `App.tsx` usage stays mostly unchanged
- drag and folder interaction flow stays unchanged

Risk:
Medium

Primary regression areas:

- local snapshot restore
- signed-in and signed-out persistence behavior
- scenario switching consistency
- cross-tab synchronization

### Phase 2: Drag Orchestration Consolidation

Objective:
Move drag preview state and folder extract orchestration out of `App.tsx` into a dedicated shortcut workspace controller.

Planned outputs:

- `src/features/shortcuts/workspace/useShortcutWorkspaceController.ts`
- `src/features/shortcuts/workspace/shortcutWorkspaceReducer.ts`
- `src/features/shortcuts/workspace/types.ts`

Expected result:

- root-grid drag state and folder-extract drag state are managed in one place
- `App.tsx` stops coordinating most intermediate shortcut drag state directly
- preview state and committed state have clearer ownership

Risk:
Medium to high

Primary regression areas:

- dragging from folder to root grid
- pending folder merge flow
- pointerup and pointercancel cleanup
- folder overlay close timing during drag

## Explicit Deferred Work

The following work is intentionally deferred until after the above phases are stable:

- redesigning drawer-driven auto-scroll
- removing synthetic pointer event forwarding
- changing grid engine APIs

Reason:
These are real architectural concerns, but they have a higher regression risk than the first two phases.

## Work Breakdown

### Phase 1 Step 1

Status: `completed`

Extract shortcut domain state from `useShortcuts` into `useShortcutStore`.

Includes:

- scenario modes state
- selected scenario state
- scenario shortcuts state
- derived `shortcuts`
- `updateScenarioShortcuts`
- ref-backed setter compatibility where still needed

### Phase 1 Step 2

Status: `completed`

Extract persistence and sync coordination into `useShortcutPersistenceSync`.

Includes:

- local profile snapshot persistence
- storage/focus/runtime-message refresh logic
- cloud sync bridge integration
- local dirty signaling integration

### Phase 1 Step 3

Status: `completed`

Extract UI-only state into `useShortcutUiState`.

Includes:

- context menu state
- shortcut editor modal state
- shortcut delete dialog state
- scenario dialog open states

### Phase 1 Step 4

Status: `completed`

Turn `useShortcuts` into a compatibility facade over the new hooks.

Success condition:

- `App.tsx` call shape remains effectively unchanged
- current screens still compile without large integration churn

### Phase 1 Step 5

Status: `pending`

Run and document regression verification for the split.

Minimum manual checks:

- create, edit, delete shortcut
- create, switch, delete scenario
- refresh and restore local state
- signed-in persistence behavior
- cross-tab update behavior

### Phase 2 Step 1

Status: `pending`

Introduce `useShortcutWorkspaceController` and define the drag/workspace state model.

### Phase 2 Step 2

Status: `pending`

Move folder extract drag and root drag preview state out of `App.tsx`.

### Phase 2 Step 3

Status: `pending`

Move pending folder merge and drag settlement handling into the workspace controller.

### Phase 2 Step 4

Status: `pending`

Stabilize integration and verify full drag regression paths.

## Validation Checklist

### Phase 1 Validation

- [ ] Create shortcut
- [ ] Edit shortcut
- [ ] Delete shortcut
- [ ] Create scenario
- [ ] Switch scenario
- [ ] Delete scenario
- [ ] Refresh page and restore local state
- [ ] Verify signed-out local persistence
- [ ] Verify signed-in persistence behavior
- [ ] Verify cross-tab sync behavior

### Phase 2 Validation

- [ ] Reorder root shortcuts
- [ ] Reorder folder-internal shortcuts
- [ ] Drag shortcut from folder to root
- [ ] Merge two shortcuts into a folder
- [ ] Name a newly merged folder
- [ ] Close folder overlay during active drag flows
- [ ] Verify pointerup cleanup
- [ ] Verify pointercancel cleanup

## Progress Log

### 2026-04-20

Current status:

- Plan documented in repo
- Phase 1 Step 1 completed
- Phase 1 Step 2 completed
- Phase 1 Step 3 completed
- Phase 1 Step 4 completed

Latest completed action:

- Extracted shortcut domain state into `src/features/shortcuts/model/useShortcutStore.ts`
- Added shared store types in `src/features/shortcuts/model/types.ts`
- Updated `useShortcuts()` to consume the new store while preserving its public shape
- Extracted persistence and sync coordination into `src/features/shortcuts/model/useShortcutPersistenceSync.ts`
- Extracted UI-only state into `src/features/shortcuts/model/useShortcutUiState.ts`
- Turned `useShortcuts()` into a composition-style facade over store, persistence, UI, and actions hooks
- Verified the refactor with `npm run typecheck`

Next intended action:

- Start Phase 1 Step 5 by running and documenting regression verification for the Phase 1 split

## Update Rules

After every completed implementation step, update this file with:

1. the new step status
2. the date
3. what changed
4. any scope adjustments
5. any newly discovered regression risk

When a step is partially complete, mark that clearly in the Progress Log before starting the next step.
