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

Status: `completed`

Run and document regression verification for the split.

Minimum manual checks:

- create, edit, delete shortcut
- create, switch, delete scenario
- refresh and restore local state
- signed-in persistence behavior
- cross-tab update behavior

### Phase 2 Step 1

Status: `completed`

Introduce `useShortcutWorkspaceController` and define the drag/workspace state model.

### Phase 2 Step 2

Status: `completed`

Move folder extract drag and root drag preview state out of `App.tsx`.

### Phase 2 Step 3

Status: `completed`

Move pending folder merge and drag settlement handling into the workspace controller.

### Phase 2 Step 4

Status: `completed`

Stabilize integration and verify full drag regression paths.

## Validation Checklist

### Phase 1 Validation

- [x] Create shortcut
- [x] Edit shortcut
- [x] Delete shortcut
- [x] Create scenario
- [x] Switch scenario
- [x] Delete scenario
- [x] Refresh page and restore local state
- [x] Verify signed-out local persistence
- [x] Verify signed-in persistence behavior
- [x] Verify cross-tab sync behavior

### Phase 2 Validation

- [x] Reorder root shortcuts
- [x] Reorder folder-internal shortcuts
- [x] Drag shortcut from folder to root
- [x] Merge two shortcuts into a folder
- [x] Name a newly merged folder
- [x] Close folder overlay during active drag flows
- [x] Verify pointerup cleanup
- [x] Verify pointercancel cleanup

## Progress Log

### 2026-04-20

Current status:

- Plan documented in repo
- Phase 1 Step 1 completed
- Phase 1 Step 2 completed
- Phase 1 Step 3 completed
- Phase 1 Step 4 completed
- Phase 1 Step 5 completed
- Phase 2 Step 1 completed
- Phase 2 Step 2 completed
- Phase 2 Step 3 completed
- Phase 2 Step 4 completed

Latest completed action:

- Added controller regression coverage for pointerup commit cleanup, pointercancel cleanup, merge-intent settlement, and dialog completion in `src/features/shortcuts/workspace/useShortcutWorkspaceController.test.tsx`
- Added workspace-core regression coverage for root reorder, folder reorder, folder-to-root extract, merge request, and folder naming in `src/features/shortcuts/workspace/shortcutWorkspaceFlows.test.ts`
- Verified the full Phase 2 drag regression checklist with `npm test` and `npm run typecheck`

Next intended action:

- Phase 2 implementation complete; next work should be a browser-driven sanity pass if UI-level confidence needs to be raised further

Scope adjustment:

- Phase 1 Step 5 was completed with automated hook-level regression coverage rather than a browser-driven end-to-end pass
- Phase 2 Step 1 only establishes workspace state ownership and compatibility setters; drag outcome handlers still live in `App.tsx`
- Phase 2 Step 2 moves folder extract drag and root preview ownership, but still leaves pending folder merge orchestration in `App.tsx`
- Phase 2 Step 3 moves pending folder merge orchestration into the controller, but shortcut tree mutation still remains in `App.tsx` callbacks instead of a fully controller-owned reducer path
- Phase 2 Step 4 was completed with controller-level and workspace-core automated regression coverage rather than a browser automation suite or manual pointer walkthrough

Newly discovered regression risk:

- Signed-in persistence behavior is now covered at the local cache and sync-bridge boundary, but a real authenticated cloud round-trip is still not exercised by automated tests
- The workspace controller currently mirrors prior `useState` semantics, so the main remaining regression risk is split ownership while drag transition logic is still shared between `App.tsx` and the new controller boundary
- Pointer-finish cleanup now runs inside the controller, so the primary remaining drag risk is the handshake between controller-managed preview state and `App.tsx`-managed folder merge state during merge-intent transitions
- The remaining Phase 2 risk is now less about state ownership and more about behavior drift across real UI drag paths, especially folder-to-root drag, merge naming, and overlay close timing under pointer cancellation
- After Step 4, the main residual gap is real browser-level interaction coverage for pointer choreography and visual overlay timing rather than logic ownership

### 2026-04-21

Current status:

- Phase 1 and Phase 2 remain completed
- Post-plan browser sanity scaffolding added for shortcut workspace interactions

Latest completed action:

- Added Playwright configuration in `playwright.config.js`
- Added browser sanity scaffolding tests in `tests/e2e/shortcut-workspace.spec.js`
- Added stable shortcut/folder overlay test selectors in shortcut workspace UI components
- Verified Playwright test discovery with `npm run test:e2e:list`
- Re-ran `npm test` and `npm run typecheck` after the selector additions

Next intended action:

- Run `npm run test:e2e:build` in an environment that can launch a browser process and open either `file://` or hosted build assets

Scope adjustment:

- The browser sanity follow-up is currently scaffolded but not executed end-to-end in this environment because the sandbox does not allow binding a local dev server port or launching the Playwright browser process

Newly discovered regression risk:

- Browser-level interaction timing is still unverified in this environment, so the remaining uncertainty is in real pointer choreography and overlay animation timing rather than application logic or type safety

## Update Rules

After every completed implementation step, update this file with:

1. the new step status
2. the date
3. what changed
4. any scope adjustments
5. any newly discovered regression risk

When a step is partially complete, mark that clearly in the Progress Log before starting the next step.
