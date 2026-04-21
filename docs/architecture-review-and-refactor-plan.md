# Leaftab Architecture Review And Refactor Plan

Date: 2026-04-21

## Scope

This review focuses on the current frontend composition around:

- `src/App.tsx`
- `src/hooks/useShortcuts.ts`
- `src/hooks/useShortcutActions.ts`
- `src/components/AppDialogs.tsx`
- `src/components/home/HomeInteractiveSurface.tsx`
- `src/components/home/HomeMainContent.tsx`
- `src/components/home/ShortcutSelectionShell.tsx`
- `src/features/shortcuts/components/RootShortcutGrid.tsx`
- `src/components/ShortcutFolderCompactOverlay.tsx`
- `src/features/shortcuts/workspace/useShortcutWorkspaceController.ts`

The goal is not to re-review the recently completed shortcut workspace extraction. The goal is to identify the next layer of architectural debt that still makes the app expensive to change.

## Executive Summary

The shortcut workspace refactor improved the codebase, but it did not yet change the fundamental composition shape of the app. The main problem is still the same: too much application-level orchestration lives in `App.tsx`, and several downstream components expose very wide contracts that make ownership boundaries blurry.

The current architecture works, but it has these costs:

- Adding a new UI flow still tends to touch the composition root.
- Dialog and surface layers are coupled through large prop bags.
- Feature hooks still aggregate too many concerns.
- Some components act as extension surfaces for too many behaviors at once.

The next refactor should optimize for narrower ownership boundaries, explicit feature facades, and fewer cross-cutting prop objects.

## Progress Tracker

Current focus: Phase 1, composition facades.

- [x] Phase 1 Step 1. Introduce `useShortcutAppFacade` and group `useShortcuts` into `shortcutDomain`, `shortcutUi`, `shortcutActions`, and `shortcutPersistence`.
- [x] Phase 1 Step 2. Introduce a dialog facade so `App.tsx` stops constructing a single giant dialog prop bag.
- [x] Phase 1 Step 3. Replace broad child `ComponentProps` pass-through contracts in the home surface with dedicated interfaces.

Current focus after Phase 1 kickoff: Phase 2, experience-layer extraction.

- [x] Phase 2 Step 1. Extract `ShortcutExperienceLayer` so `App.tsx` no longer owns the selection shell, home interactive surface, compact folder overlay, and folder-name dialog JSX directly.
- [x] Phase 2 Step 2. Extract sync dialog composition into a dedicated layer or facade.
- [x] Phase 2 Step 3. Extract settings and utility dialogs into a dedicated layer or facade.

### Progress Log

#### 2026-04-21

- Completed Phase 1 Step 1.
- Added `src/features/shortcuts/app/useShortcutAppFacade.ts` as the first composition facade layer.
- Updated `src/App.tsx` to consume grouped shortcut slices instead of destructuring the entire `useShortcuts` return object directly.
- No behavior changes were intended in this step. The goal was to shrink the composition boundary and prepare `App.tsx` for later extraction work.
- Verification after the step:
  - `npm run typecheck`
  - `npm test`

- Completed Phase 2 Step 1.
- Added `src/features/shortcuts/app/ShortcutExperienceLayer.tsx`.
- Exported explicit prop types from `ShortcutSelectionShell`, `HomeInteractiveSurface`, and `ShortcutFolderCompactOverlay` so the new layer has a stable typed boundary.
- Updated `src/App.tsx` to delegate the shortcut experience JSX tree to `ShortcutExperienceLayer`.
- No behavior changes were intended in this step. The goal was to reduce the size of `App.tsx` and move shortcut-experience composition into a dedicated layer.
- Verification after the step:
  - `npm run typecheck`
  - `npm test`

- Completed Phase 2 Step 2.
- Added `src/features/shortcuts/app/ShortcutSyncDialogsLayer.tsx`.
- Updated `src/App.tsx` to delegate the LeafTab sync dialog, sync encryption dialog, and dangerous-sync dialog composition to `ShortcutSyncDialogsLayer`.
- No behavior changes were intended in this step. The goal was to continue shrinking the main composition root and isolate sync dialog orchestration.
- Verification after the step:
  - `npm run typecheck`
  - `npm test`

- Completed Phase 1 Step 2 and Phase 2 Step 3.
- Added `src/features/shortcuts/app/ShortcutAppDialogsLayer.tsx`.
- Exported `AppDialogsProps` from `src/components/AppDialogs.tsx` so the remaining app-dialog composition has a stable typed boundary.
- Updated `src/App.tsx` to delegate the remaining shortcut, scenario, auth, settings, backup, sync-provider, and consent dialog assembly to `ShortcutAppDialogsLayer`.
- No behavior changes were intended in this step. The goal was to remove the remaining giant app-dialog prop bag from `App.tsx` and move settings and utility dialog orchestration behind a dedicated layer.
- Verification after the step:
  - `npm run typecheck`
  - `npm test`

- Completed Phase 1 Step 3.
- Exported explicit prop types from `TopNavBar` and `WallpaperClock`, and introduced dedicated home-surface prop types in `src/components/home/HomeMainContent.tsx`.
- Updated `HomeInteractiveSurface` and `QuickAccessDrawer.shared` to consume named home-surface prop contracts instead of `ComponentProps<typeof Child>` pass-through types.
- Removed stale login-banner props from the `HomeMainContent` boundary so the home surface no longer carries unused auth-related API surface.
- No behavior changes were intended in this step. The goal was to narrow the home-surface composition contracts and reduce type-level coupling between parent layers and child implementation details.
- Verification after the step:
  - `npm run typecheck`
  - `npm test`

## Review Findings

### 1. `App.tsx` is still the real composition bottleneck

Evidence:

- `src/App.tsx:737-803`
- `src/App.tsx:3727-4200`

`App.tsx` still owns:

- shortcut domain state wiring
- workspace controller wiring
- folder transition wiring
- dialog orchestration
- wallpaper and home surface orchestration
- sync dialog orchestration
- modal-specific callback construction

The recent workspace controller extraction removed some logic from `App`, but `App` is still the one place where nearly every interaction domain converges. This means the file remains the highest-risk merge point and the place most future features will keep expanding.

Impact:

- high regression surface
- difficult local reasoning
- expensive refactors because unrelated domains are still assembled together

### 2. `useShortcuts` is still a service-locator style hook

Evidence:

- `src/hooks/useShortcuts.ts:11-167`
- `src/hooks/useShortcuts.ts:169-203`
- `src/App.tsx:737-769`

`useShortcuts` currently bundles:

- store setup
- persistence sync
- UI state
- domain reporting
- action assembly

It returns a large mixed object containing raw state, setters, refs, UI toggles, persistence controls, and business actions. `App` then destructures a large subset of that object directly.

This shape makes the hook easy to consume initially, but it hides ownership boundaries. It also encourages future code to keep attaching more responsibilities to the same hook because it is already the central shortcut entry point.

Impact:

- weak separation between domain state and UI state
- hard to reuse smaller subsets cleanly
- difficult to test feature slices in isolation

### 3. Dialog composition is still organized as a prop bag aggregator

Evidence:

- `src/components/AppDialogs.tsx:86-220`
- `src/App.tsx:3894-4200`

`AppDialogs` receives seventeen dialog prop groups plus several inline async workflows. This reduces JSX noise in `App`, but it does not actually move ownership. `App` still constructs the dialog state and action payloads inline, and `AppDialogs` acts mostly as a passthrough registry.

This is a structural smell rather than a style preference issue. The component boundary does not create a domain boundary.

Impact:

- dialog behavior remains rooted in `App`
- changes to one dialog layer often still require edits in two places
- difficult to split sync dialogs, settings dialogs, and shortcut dialogs into separate ownership zones

### 4. Main home surface contracts are too wide and too coupled to implementation details

Evidence:

- `src/components/home/HomeInteractiveSurface.tsx:39-77`
- `src/components/home/HomeMainContent.tsx:22-56`

`HomeInteractiveSurface` and `HomeMainContent` both expose large contracts. `HomeInteractiveSurface` accepts multiple `ComponentProps`-derived bags from child components. `HomeMainContent` directly accepts `ComponentProps<typeof RootShortcutGrid>`, `ComponentProps<typeof WallpaperClock>`, and `ComponentProps<typeof SearchExperience>`.

This pattern is convenient short-term, but it creates leaky abstractions:

- parent layers have to know too much about child component API surfaces
- child component changes ripple upward
- composition types become wider over time because "pass the full child props" is the easiest option

Impact:

- weak encapsulation
- type-level coupling between distant layers
- hard to stabilize surface-level domain interfaces

### 5. `RootShortcutGrid` has become an overloaded extension surface

Evidence:

- `src/features/shortcuts/components/RootShortcutGrid.tsx:146-189`

`RootShortcutGridProps` now contains a large number of optional flags and override hooks:

- selection mode controls
- drag extraction controls
- reorder controls
- heat zone debug controls
- large folder toggles
- render overrides for card, drag preview, and selection indicator

This usually means one component is trying to serve too many modes instead of exposing smaller compositions. The component is powerful, but it is also easy to put into states that are valid at the type level while still being poorly constrained at the architecture level.

Impact:

- more combinations to reason about
- harder API evolution
- harder future extraction of folder-specific and root-specific behaviors

### 6. `ShortcutSelectionShell` owns too many UI workflows at once

Evidence:

- `src/components/home/ShortcutSelectionShell.tsx:27-49`
- `src/components/home/ShortcutSelectionShell.tsx:131-240`

`ShortcutSelectionShell` currently owns:

- context menu state mediation
- multi-select mode
- bulk delete flow
- move-to-scenario flow
- move-to-folder flow
- folder display mode context actions

This component is doing real work, not just shell composition. It mixes controller logic, derived selection state, menu rendering, and confirmation flows. That makes it another mini composition root inside the home surface.

Impact:

- growing local state hub
- difficult reuse if selection behavior needs to appear elsewhere
- more friction when changing context menu behavior independently from selection workflows

### 7. There are visible signs of API mismatch in current component boundaries

Evidence:

- `src/components/home/HomeMainContent.tsx:64-97`

`HomeMainContent` explicitly receives `user`, `loginBannerVisible`, `onLoginRequest`, and `onDismissLoginBanner`, but those props are currently prefixed as unused. That usually means the boundary still reflects an older ownership model even after behavior moved elsewhere.

This is not a severe bug, but it is a useful signal: some component interfaces are wider than their real responsibilities.

Impact:

- stale API surface
- unnecessary prop churn
- harder to understand which layer actually owns a concern

## Recommended Refactor Direction

The next refactor should not be a broad rewrite. It should target composition boundaries in a sequence that reduces future coupling.

Guiding principles:

- move from wide prop bags to explicit domain facades
- move from "one giant hook per feature" to smaller ownership slices
- prefer layer components that own a domain, not registry wrappers
- narrow child contracts instead of passing raw `ComponentProps` through multiple levels

## Proposed Plan

### Phase 1. Introduce explicit composition facades

Goal:

- reduce direct dependency on giant hook return objects
- create stable interfaces before moving files around

Tasks:

- create a `shortcut app facade` layer that wraps `useShortcuts` and exposes grouped slices such as:
  - `shortcutDomain`
  - `shortcutUi`
  - `shortcutActions`
  - `shortcutPersistence`
- create a `dialog facade` shape that groups dialog state by domain:
  - `shortcutDialogs`
  - `settingsDialogs`
  - `syncDialogs`
- create dedicated interface types for home surface props instead of forwarding `ComponentProps<typeof Child>`

Deliverables:

- new facade types under `src/features/shortcuts/...` or `src/features/app/...`
- `App.tsx` destructuring reduced into a few grouped objects

### Phase 2. Split `App.tsx` by ownership, not by visual size

Goal:

- move orchestration into domain layers

Tasks:

- extract a `ShortcutExperienceLayer` that owns:
  - selection shell
  - root grid composition
  - folder overlay composition
  - folder naming flow
- extract a `SyncDialogsLayer` that owns sync-related dialog props and callbacks
- extract a `SettingsAndUtilityDialogsLayer` for settings, about, admin, guide, import/export

Rules:

- each extracted layer should construct its own prop objects internally
- `App.tsx` should pass grouped domain state, not per-dialog callback bags

Deliverables:

- `App.tsx` becomes a high-level shell with a few domain layers

### Phase 3. Narrow public component contracts

Goal:

- make components cheaper to understand and safer to evolve

Tasks:

- replace `ComponentProps<typeof RootShortcutGrid>` in `HomeMainContent` with a dedicated `HomeShortcutGridProps`
- replace `ComponentProps<typeof WallpaperClock>` and `ComponentProps<typeof SearchExperience>` pass-through contracts with domain-specific interfaces
- split `RootShortcutGrid` optional feature surface into clearer groups, for example:
  - core layout props
  - drag/extract behavior props
  - selection behavior props
  - debug props

Deliverables:

- smaller component interfaces
- clearer intent at the composition layer

### Phase 4. Separate selection workflows from shell rendering

Goal:

- stop `ShortcutSelectionShell` from becoming another architecture hotspot

Tasks:

- extract selection state and derived data into a dedicated controller hook
- keep `ShortcutSelectionShell` focused on rendering and coordination
- extract bulk action menus or context menu sections into smaller subcomponents

Deliverables:

- controller/presenter split for selection workflows
- less local state density in the shell component

### Phase 5. Break `useShortcuts` into stable subdomains

Goal:

- finish the move away from the service-locator hook shape

Tasks:

- split shortcut domain state from shortcut UI state
- isolate persistence-sync concerns behind their own facade
- move domain reporting out of the default shortcut aggregation path unless required
- keep action hooks scoped to the state slice they mutate

Possible target shape:

- `useShortcutDomainState`
- `useShortcutUiState`
- `useShortcutPersistenceFacade`
- `useShortcutActionFacade`

Deliverables:

- better testability
- lower blast radius for future shortcut work

## Suggested Execution Order

Do these in order:

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5

This order matters. If public contracts are narrowed before facades exist, the refactor will create churn. If `App.tsx` is split before ownership is clarified, the result will just be the same prop bags spread across more files.

## Acceptance Criteria

The refactor can be considered successful when:

- `App.tsx` no longer destructures large mixed state/action bundles directly from `useShortcuts`
- dialog layers are grouped by domain, not by "all modals in one place"
- `HomeInteractiveSurface` and `HomeMainContent` stop forwarding broad child `ComponentProps`
- `RootShortcutGrid` exposes a smaller, more intentional public API
- selection workflows can evolve without modifying the main app composition root

## Recommended First Slice

The highest-value next slice is:

1. create shortcut and dialog facades
2. extract a `ShortcutExperienceLayer`
3. reduce `App.tsx` to high-level shell composition

This first slice should deliver the best payoff because it attacks the real coordination bottleneck instead of polishing leaf components first.

## Notes

- The existing shortcut workspace controller refactor was worthwhile and should remain the foundation for the next phase.
- The next round should avoid mixing architecture cleanup with visual redesign or sync feature changes.
- Keep the scope architectural. Do not combine this plan with unrelated asset or icon-library work.
