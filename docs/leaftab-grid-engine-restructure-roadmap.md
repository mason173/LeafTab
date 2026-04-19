# LeafTab Grid Engine Restructure Roadmap

## Purpose

This document is the execution roadmap for the final `LeafTab` grid-engine architecture.

It assumes:

- `LeafTab` is the only long-term maintained product repo
- `/666` continues to exist only as a clean interaction lab during the transition
- the final source of truth must converge back into `LeafTab`
- root grid, folder-internal grid, small folders, large folders, and extraction must all share one engine

This is not a generic library roadmap.
This is a `LeafTab`-specific consolidation plan.

## Final Positioning

### What `/666` is

`/666` is an incubation workspace for:

- interaction experiments
- heat-zone validation
- drag feel tuning
- architecture prototyping outside old host complexity

### What `/666` is not

`/666` is not a long-term second implementation of the real engine.

Once a rule is accepted, the authoritative implementation must live in `LeafTab`.

### Final rule

There must be only one formal engine implementation:

- formal source of truth: `LeafTab`
- experimental playground: `/666` now, later an in-repo grid lab

## Target Architecture

The final architecture should settle into five layers.

```text
LeafTab
├─ packages/
│  ├─ grid-domain/
│  ├─ grid-runtime/
│  ├─ grid-react/
│  └─ grid-preset-leaftab/
├─ src/features/shortcuts/
│  ├─ grid-host/
│  ├─ components/
│  └─ visuals/
└─ playgrounds/
   └─ grid-lab/
```

## Layer Responsibilities

### `packages/grid-domain`

Pure rule layer.
No React.
No DOM.
No product dialogs.

Owns:

- recognition-point semantics
- red-zone vs green-zone precedence
- reorder dwell and merge dwell policy
- vacancy locking
- reorder, merge, enter-folder, extract intent resolution
- fixed-obstacle behavior for large folders
- drag-mode and interaction-profile semantics
- target-region contracts

### `packages/grid-runtime`

Runtime orchestration layer.
Still framework-agnostic where possible.

Owns:

- pointer session lifecycle
- dwell timers
- extraction handoff timing
- auto-scroll timing and bounds
- drag runtime state transitions
- projection settle lifecycle

### `packages/grid-react`

React and DOM bridge only.

Owns:

- DOM measurement
- portal drag preview rendering
- React wrappers over runtime
- measurement snapshots
- event wiring from pointer events to runtime

Must not own:

- product-specific folder rules
- persistence rules
- dialog policy
- host business mutations

### `packages/grid-preset-leaftab`

LeafTab-specific geometry and visual preset layer.

Owns:

- icon size mapping
- title floating geometry
- large-folder visual sizing algorithm
- `cellRect`, `hitRect`, `previewRect` construction
- LeafTab-target hit-region presets

### `src/features/shortcuts/grid-host`

LeafTab product bridge.

Owns:

- engine intent -> shortcut mutations
- folder extract -> root external drag session
- folder open/close integration
- rename / merge / dissolve host behavior
- app-level state coordination

Must remain thin.

## Non-Negotiable Design Rules

### 1. One engine path only

There must not be separate drag engines for:

- root surface
- folder surface
- large-folder movement
- extracted-child root session

All of them must use one engine with different profiles.

### 2. Host wrappers stay thin

Files under `src/features/shortcuts/components` should remain composition wrappers.

They may:

- pass visuals
- pass layout inputs
- map intents
- expose debugging UI

They must not:

- re-implement hit-testing
- re-implement displacement logic
- re-implement reorder claiming
- re-implement merge/enter-folder semantics

### 3. Mode differences become configuration

Behavior differences must be represented by an explicit `interactionProfile`, not scattered conditionals.

### 4. Geometry contract is explicit

Every target must expose three rect types:

- `cellRect`
- `hitRect`
- `previewRect`

### 5. Vacancy is first-class state

Vacancy must be modeled explicitly, not only inferred from projection side effects.

## Current State Summary

Today the repo already has a good base:

- `packages/grid-core`
- `packages/grid-react`
- `packages/grid-preset-leaftab`
- thin host wrappers in `src/features/shortcuts/components`
- boundary verification in `scripts/check-grid-boundaries.mjs`

The current strongest part:

- root and folder-opened surfaces are now much closer to one engine path

The current weakest part:

- too much responsibility is still concentrated inside `packages/grid-react/src/RootShortcutGrid.tsx`

## Current Architecture Status

The current branch has already crossed an important consolidation line:

- `packages/grid-react/src/FolderShortcutSurface.tsx` is now a thin composition adapter over `RootShortcutGrid`
- package-level folder-specific drag runtime and hover-resolution modules have been removed
- folder-opened drag behavior now enters through the same React engine path and differs by `interactionProfile`
- `RootShortcutGrid` public contracts and assembly constants have been extracted into `packages/grid-react/src/rootShortcutGridContracts.ts`
- pure packed-layout, reorder-slot, hover-state, and projection derivation has been extracted into `packages/grid-react/src/rootResolution/useRootShortcutGridDerivedState.ts`

This means Phase 5 is no longer theoretical groundwork.
The dedicated package-level folder engine concept has already been retired in implementation.

The remaining work is to:

- keep shrinking wrapper-only surfaces
- continue moving shared semantics down into clearer domain/runtime contracts
- reduce remaining monolith pressure inside `RootShortcutGrid.tsx`

## Current Files To Keep

These are valid foundations and should stay.

- `packages/grid-core/src/drag/types.ts`
- `packages/grid-core/src/drag/resolveRootDropIntent.ts`
- `packages/grid-core/src/domain/dropIntents.ts`
- `packages/grid-react/src/RootShortcutGrid.tsx`
- `packages/grid-react/src/rootShortcutGridHelpers.ts`
- `packages/grid-react/src/compactRootHover.ts`
- `packages/grid-preset-leaftab/src/layout.ts`
- `packages/grid-preset-leaftab/src/rootGridPreset.ts`
- `src/features/shortcuts/components/RootShortcutGrid.tsx`
- `src/features/shortcuts/components/FolderShortcutSurface.tsx`
- `src/features/shortcuts/gridEngine/leaftabGridEngineHostAdapter.ts`

## Current Files To Shrink

These files should survive, but get smaller.

- `packages/grid-react/src/RootShortcutGrid.tsx`
- `packages/grid-react/src/FolderShortcutSurface.tsx`
- `packages/grid-preset-leaftab/src/layout.ts`
- `src/features/shortcuts/components/RootShortcutGrid.tsx`
- `src/features/shortcuts/components/FolderShortcutSurface.tsx`

## Future Module Split

The main refactor target is `packages/grid-react/src/RootShortcutGrid.tsx`.

It should be broken up into modules like these.

```text
packages/grid-react/src/
  RootShortcutGrid.tsx
  rootRuntime/
    pointerSession.ts
    autoScroll.ts
    extractHandoff.ts
    hoverTiming.ts
    dragSettle.ts
  rootResolution/
    resolveHoverResolution.ts
    resolveHeatZoneInspector.ts
    resolveProjectionOffsets.ts
    resolveProjectedDropPreview.ts
    resolveDragSettleTarget.ts
  rootGeometry/
    measureGridItems.ts
    rectContracts.ts
    compactRegions.ts
```

And in `grid-core`, move toward this split.

```text
packages/grid-core/src/
  domain/
    interactionProfile.ts
    vacancyModel.ts
    intentResolvers.ts
  geometry/
    rectContracts.ts
    targetRegions.ts
  runtime-types/
    dragSession.ts
    hoverState.ts
```

## Recommended Final Interaction Profile Shape

Create one shared profile object instead of spreading behavior through booleans.

Suggested shape:

```ts
type InteractionProfile = {
  kind:
    | 'root-normal'
    | 'root-folder-drag'
    | 'root-large-folder-drag'
    | 'root-extracted-child'
    | 'folder-internal';
  allowMerge: boolean;
  allowEnterFolder: boolean;
  treatAllTargetZonesAsReorder: boolean;
  reorderDwellMs: number;
  mergeDwellMs: number;
  bypassReorderDwellAfterLeavingCore: boolean;
  allowBoundaryExtract: boolean;
  fixedObstacleKinds: Array<'large-folder'>;
};
```

This is the key to preventing future root/folder drift.

## Recommended Final Rect Contract

Create one explicit geometry contract and use it everywhere.

```ts
type GridTargetRects = {
  cellRect: DragRect;
  hitRect: DragRect;
  previewRect: DragRect;
  coreRect?: DragRect;
};
```

Meaning:

- `cellRect`: occupancy and slot layout only
- `hitRect`: reorder / merge / folder-entry hit testing
- `previewRect`: visual center and drag overlay continuity
- `coreRect`: optional explicit green-zone region when a target needs it

## Recommended Final Vacancy Model

Make vacancy explicit.

Suggested state:

```ts
type VacancyState = {
  originIndex: number;
  projectedDropIndex: number | null;
  lockedIndex: number | null;
  source:
    | 'origin'
    | 'reorder-claim'
    | 'merge-bridge'
    | 'folder-extract'
    | 'large-folder-drag';
};
```

This is what protects:

- red-zone displacement persistence
- merge-entry stability
- leaving green-zone back to red-zone re-evaluation
- large-folder obstacle consistency

## Refactor Phases

## Phase 0: Freeze Direction

Goal:

- stop treating `/666` and `LeafTab` as long-term parallel implementations

Tasks:

- declare `LeafTab` the only formal engine source
- declare `/666` the incubation repo only
- point future engine docs to `LeafTab/docs`

Exit criteria:

- no future architecture decision assumes dual formal sources

## Phase 1: Split Runtime From Resolution

Goal:

- reduce `RootShortcutGrid.tsx` from a monolith into separable runtime and resolution modules

Files involved:

- `packages/grid-react/src/RootShortcutGrid.tsx`
- new `packages/grid-react/src/rootRuntime/*`
- new `packages/grid-react/src/rootResolution/*`

Tasks:

- extract pointer session logic
- extract auto-scroll loop
- extract extract-handoff logic
- extract hover timing logic
- extract projection preview logic
- keep `RootShortcutGrid.tsx` as assembly, not implementation bulk

Current status:

- runtime and resolution primitives have already been split into `rootRuntime/*` and `rootResolution/*`
- `RootShortcutGrid` contracts/config have been moved out of the component file
- projection-adjacent derived state now flows through `useRootShortcutGridDerivedState`
- the next pressure point is the remaining controller assembly and event wiring still living in `RootShortcutGrid.tsx`

Exit criteria:

- `RootShortcutGrid.tsx` becomes primarily composition
- runtime logic can be reasoned about separately from hover rules

## Phase 2: Introduce `interactionProfile`

Goal:

- remove behavioral drift caused by scattered conditional branches

Files involved:

- `packages/grid-core/src/drag/types.ts`
- `packages/grid-core/src/drag/resolveRootDropIntent.ts`
- `packages/grid-core/src/domain/*`
- `packages/grid-react/src/RootShortcutGrid.tsx`
- `src/features/shortcuts/components/FolderShortcutSurface.tsx`

Tasks:

- define profile type
- map current modes into explicit profiles
- replace `forceReorderOnly`-style ad hoc flow with profile-driven behavior
- treat folder-internal drag as one profile, not a special subsystem

Exit criteria:

- every drag session can be described by a single explicit profile
- there is no hidden behavioral branch only discoverable inside UI wrappers

## Phase 3: Formalize Rect Contracts

Goal:

- make geometry stable under future visual changes

Files involved:

- `packages/grid-preset-leaftab/src/layout.ts`
- `packages/grid-react/src/rootShortcutGridHelpers.ts`
- new `packages/grid-core/src/geometry/*`
- docs

Tasks:

- define `cellRect`, `hitRect`, `previewRect`
- rename ambiguous region concepts where needed
- ensure titles and decorative visuals never change hit semantics accidentally
- ensure large-folder visual sizing consumes the same rect contract

Exit criteria:

- visual adjustments can happen without breaking hit-testing
- geometry intent is obvious from types

## Phase 4: Promote Vacancy To Shared State

Goal:

- make claimed-slot and locked-vacancy behavior explicit and testable

Files involved:

- `packages/grid-core/src/domain/*`
- `packages/grid-react/src/rootResolution/*`
- docs

Tasks:

- create vacancy model
- route reorder projection through vacancy state
- route merge-entry bridge preservation through vacancy state
- route green-to-red re-evaluation through vacancy state

Exit criteria:

- vacancy behavior no longer depends on implicit projection side effects
- red-zone and green-zone transitions are easier to audit

## Phase 5: Retire Dedicated Folder Engine Concepts

Goal:

- eliminate the idea that folder dragging is a separate engine

Files involved:

- `packages/grid-react/src/FolderShortcutSurface.tsx`
- `packages/grid-preset-leaftab/src/folderSurfacePreset.ts`
- host wrappers

Tasks:

- reduce package-level folder surface logic to composition helpers or remove it entirely if redundant
- make folder-opened behavior clearly a root engine with a folder profile
- keep only host-only folder concerns in host wrappers

Current status:

- package-level dedicated folder runtime/resolution modules have been removed
- `packages/grid-react/src/FolderShortcutSurface.tsx` now delegates to `RootShortcutGrid`
- host wrappers still exist, but they are composition-only and profile-driven

Exit criteria:

- "folder surface" means a host composition, not a second engine path

## Phase 6: Move `/666` Into An In-Repo Lab

Goal:

- preserve the clean experimentation environment without preserving a second formal codebase

Target:

```text
playgrounds/grid-lab/
```

Tasks:

- copy the valuable interaction-demo ideas from `/666`
- wire the lab to the in-repo packages
- let future hand-feel work happen against the real engine packages

Exit criteria:

- clean experimentation still exists
- formal implementation remains single-source

## Phase 7: Documentation Lock

Goal:

- make future maintenance cheaper for one maintainer

Tasks:

- keep `docs/compact-grid-rules.md` as behavior contract
- keep this roadmap updated when the architecture changes materially
- add one concise module-ownership document if needed

Exit criteria:

- future changes can be classified quickly as `domain`, `runtime`, `react bridge`, `preset`, or `host`

## File-Level Migration Map

### Keep As Host Wrappers

- `src/features/shortcuts/components/RootShortcutGrid.tsx`
- `src/features/shortcuts/components/FolderShortcutSurface.tsx`
- `src/components/ShortcutGrid.tsx`

### Keep As Host Business Bridge

- `src/features/shortcuts/gridEngine/leaftabGridEngineHostAdapter.ts`
- `src/App.tsx` integration points

### Shrink And Split

- `packages/grid-react/src/RootShortcutGrid.tsx`
- `packages/grid-react/src/FolderShortcutSurface.tsx`
- `packages/grid-preset-leaftab/src/layout.ts`

### Promote Into Shared Domain Modules

- intent semantics currently embedded across:
  - `packages/grid-core/src/drag/resolveRootDropIntent.ts`
  - `packages/grid-core/src/domain/dropIntents.ts`
  - `packages/grid-react/src/compactRootHover.ts`

### Replaced In This Branch

- the previous package-level folder-specific engine path that duplicated root behavior

## Execution Order

Recommended order:

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7

Do not start Phase 5 before Phase 2 is done.
Do not move `/666` into a lab before the engine split is stable enough to support it.

## What Success Looks Like

At the end of this roadmap:

- `LeafTab` is the only formal source of engine truth
- root and folder-opened drag feel come from one engine path
- behavior differences are profile-driven, not branch-driven
- geometry changes do not silently break interaction
- vacancy behavior is explicit
- the host layer remains thin
- experimentation still exists, but inside the product repo

## Immediate Next Step

The next best concrete move is:

- start Phase 1 by splitting `packages/grid-react/src/RootShortcutGrid.tsx` into runtime modules and resolution modules

That gives the largest long-term maintainability win with the lowest product-risk ratio.
