# LeafTab Search Architecture Refactor Plan

Date: 2026-04-24

## Scope

This plan focuses on the current search experience composition around:

- `src/components/search/SearchExperience.tsx`
- `src/components/SearchBar.tsx`
- `src/components/search/SearchField.tsx`
- `src/components/search/SearchSuggestionsPanel.tsx`
- `src/hooks/useSearch.ts`
- `src/hooks/useSearchSuggestions.ts`
- `src/hooks/useSearchSuggestionSources.ts`
- `src/hooks/useSearchInteractionController.ts`
- `src/utils/searchSuggestionsComputation.ts`
- `src/utils/searchSuggestionSources.ts`
- `src/utils/searchSessionModel.ts`
- `src/workers/searchSuggestions.worker.ts`

The goal is not to redesign search behavior. The goal is to narrow architecture boundaries so the current feature set can stay responsive as search complexity continues to grow.

## Why This Refactor Exists

The current search feature already does many things well:

- query parsing
- command modes
- permission-aware sources
- worker-backed suggestion computation
- keyboard interaction
- inline calculator and search-prefix preview

The problem is no longer feature completeness. The problem is that the search composition boundary has become too wide.

Today, the search layer mixes:

- high-frequency input state
- permission orchestration
- browser tab listeners
- slash command catalog building
- suggestion-source loading
- worker request orchestration
- suggestion panel rendering
- activation-handle integration

That shape has two direct costs:

1. It makes input responsiveness harder to protect.
2. It makes future optimization work more expensive because unrelated concerns share the same render and state graph.

## Review Summary

This plan is based on the current review findings:

1. `useSearchSuggestions()` still ships full `shortcuts` into the worker even though it already maintains `shortcutSearchIndex`.
2. Search index maintenance currently runs whenever shortcuts change, even when the user is not actively searching.
3. `SearchExperience` acts as a broad orchestration hub for both long-lived environment state and per-keystroke interaction state.
4. `SearchBar` still renders the input shell and suggestion panel inside the same high-frequency render boundary.

These findings align most closely with the following `vercel-react-best-practices` categories:

- `rerender-split-combined-hooks`
- `rerender-defer-reads`
- `rerender-use-deferred-value`
- `rerender-transitions`
- `client-event-listeners`
- `bundle-conditional`
- `js-request-idle-callback`

## Success Criteria

This refactor should be considered successful when most of the following are true:

- Typing one character no longer forces unrelated permissions, slash metadata, or browser-context orchestration through the same render path.
- Suggestion worker requests no longer structured-clone the full shortcut tree on each keystroke.
- Shortcut drag, reorder, or folder edits no longer rebuild search indexes unless the search feature is actually active.
- Search input shell and suggestion panel can be profiled separately and no longer commit in lockstep.
- `SearchExperience` becomes a thin composition layer instead of the place where every search concern converges.

## Non-Goals

This plan does not aim to do the following in the first pass:

1. Change search ranking rules.
2. Redesign the search UI visually.
3. Replace the worker with a new infrastructure layer.
4. Introduce server-side search orchestration.
5. Rewrite command parsing semantics.

## Phase Tracker

Current focus: Phase 2 and Phase 3 cleanup after the first hot-path reductions landed.

- [ ] Phase 0 Step 1. Capture current search interaction baseline and profiling traces.
- [x] Phase 1 Step 1. Shrink worker payload and remove full-shortcut structured clone from the typing path.
- [x] Phase 1 Step 2. Gate shortcut index maintenance so non-search interactions stop paying search costs.
- [~] Phase 2 Step 1. Split environment orchestration from per-input controller logic.
- [x] Phase 2 Step 2. Isolate permission and browser-context subscriptions into dedicated hooks.
- [x] Phase 3 Step 1. Split input shell and suggestion panel into separate memo boundaries.
- [ ] Phase 3 Step 2. Narrow `SearchBar` and `SearchExperience` prop surfaces to view-model style contracts.
- [ ] Phase 4 Step 1. Stabilize slash command catalog and move static command definitions out of the typing hot path.
- [ ] Phase 4 Step 2. Re-run profiling and decide whether to move search index ownership into the shortcuts domain permanently.

## Verification

For each completed step, update at least part of this checklist:

- `npm run typecheck`
- `npm test`
- React DevTools Profiler:
  - search type
  - open search with empty query
  - `/b` or `/tabs` command mode enter
- Manual interaction checks:
  - rapid typing
  - keyboard selection navigation
  - permission request flows
  - opening search while shortcuts are being edited elsewhere

If a step does not include profiler or test verification, note that explicitly in the progress log.

## Phase 0: Establish A Search Baseline

### Step 1. Capture current baseline

Goal:

- Confirm where the current search costs actually land before structural changes.

Suggested profiling scenarios:

- Type 6 to 10 characters in default mode.
- Type `/b`, `/historys`, `/tabs`.
- Navigate suggestions with arrow keys.
- Open search while shortcuts are being reordered or edited.

Capture at least:

- `SearchExperience`
- `SearchBar`
- `SearchSuggestionsPanel`
- `SearchField`
- any shortcut-index preparation work that appears during non-search interactions

Completion standard:

- There is at least one profiler comparison point before refactor work starts.

## Phase 1: Remove Avoidable Hot-Path Cost

### Step 1. Shrink worker payload

Problem:

- `useSearchSuggestions()` already computes and stores `shortcutSearchIndex`, but worker input still includes full `shortcuts`.
- That means every typed character can pay structured-clone cost for both:
  - `shortcuts`
  - `shortcutSearchIndex`

Goal:

- Reduce worker requests to the minimum data required for ranking and rendering.

Target files:

- `src/hooks/useSearchSuggestions.ts`
- `src/utils/searchSuggestionsComputation.ts`
- `src/utils/searchSuggestionSources.ts`
- `src/workers/searchSuggestions.worker.ts`

Recommended approach:

- Make `SearchSuggestionsComputationInput` accept only already-prepared source inputs.
- Remove raw `shortcuts` from worker input once `shortcutSearchIndex` is available.
- Keep fallback logic explicit so worker-disable mode still works without branching across multiple layers.

Completion standard:

- Worker payload no longer includes full `shortcuts`.
- Typing cost is no longer inflated by shortcut-tree cloning.

### Step 2. Gate shortcut index maintenance

Problem:

- Search index rebuilds currently happen whenever shortcuts change, even if search is closed and the user is not typing.
- This leaks search maintenance cost into unrelated interactions like drag, reorder, and folder editing.

Goal:

- Ensure shortcut search indexing only runs when search is active or when a stable background refresh is genuinely justified.

Target files:

- `src/hooks/useSearchSuggestions.ts`
- potentially `src/components/search/SearchExperience.tsx`
- potentially shortcuts-domain files if ownership is lifted

Recommended approach:

- Introduce an explicit `searchActive` signal based on:
  - `historyOpen`
  - non-empty `searchValue`
  - command-mode activation
- Only build or refresh indexes eagerly when search is active.
- If background freshness is still desired, make it idle-only and cancelable rather than immediate.

Completion standard:

- Shortcut edits outside active search no longer trigger immediate search-index rebuilds.

## Phase 2: Split Search Orchestration By Responsibility

### Step 1. Separate controller logic from environment integration

Problem:

- `SearchExperience` currently mixes long-lived environment subscriptions with per-input interaction orchestration.

Goal:

- Turn `SearchExperience` into a thin composition boundary.

Recommended target split:

- `useSearchController`
  - input value
  - panel state
  - session model
  - submit decision
  - selected action resolution
- `useSearchEnvironment`
  - permissions
  - current browser tab
  - blocking-layer activity
  - activation handle registration
- `SearchExperienceViewModel`
  - a narrow object consumed by render components

Target files:

- `src/components/search/SearchExperience.tsx`
- new hooks under `src/hooks/` or `src/components/search/`

Completion standard:

- `SearchExperience` stops owning every search concern directly.
- Input-state changes no longer run through unrelated environment logic.

### Step 2. Isolate permission and browser-context subscriptions

Problem:

- permissions and browser tab subscriptions are long-lived integration concerns, but they currently live directly inside the keystroke-heavy component.

Goal:

- Give these concerns dedicated hooks with stable outputs and narrow update surfaces.

Suggested extractions:

- `useSearchPermissionsState`
- `useCurrentBrowserTabId`
- `useSearchBlockingLayerState`

Completion standard:

- These integrations can change independently without forcing a conceptual reread of the full search component.

## Phase 3: Narrow Render Boundaries

### Step 1. Split input shell and suggestions panel

Problem:

- `SearchBar` still renders the input shell and suggestions panel inside one high-frequency subtree.
- Suggestion churn is higher than input-shell churn, so the current boundary lets suggestion updates degrade typing responsiveness.

Goal:

- Make input-shell rendering and suggestion-panel rendering independently skippable.

Target files:

- `src/components/SearchBar.tsx`
- `src/components/search/SearchField.tsx`
- `src/components/search/SearchSuggestionsPanel.tsx`

Recommended approach:

- Extract memoized `SearchInputShell`.
- Extract memoized `SearchSuggestionsSurface`.
- Compute frosted theme once, then pass only the minimal theme slice each child actually needs.

Completion standard:

- The input shell can remain stable while panel selection, notice banners, or suggestion items churn.

### Step 2. Narrow prop contracts

Problem:

- current search props still reflect implementation-level wiring more than stable view contracts.

Goal:

- Move from wide "wire everything through" props to explicit view-model style contracts.

Examples:

- `SearchField` should not need panel-level knowledge it does not directly render.
- `SearchSuggestionsPanel` should receive a render-ready panel model instead of a mix of unrelated flags.

Completion standard:

- Search UI children expose clearer ownership boundaries.

## Phase 4: Finish Structural Cleanup

### Step 1. Stabilize slash command catalog

Problem:

- Slash command metadata is currently rebuilt inside the main search component and partially depends on broader app state.

Goal:

- Separate static command definitions from dynamic command detail resolution.

Recommended approach:

- Keep a static command registry at module scope.
- Resolve dynamic `detail` strings in a smaller mapping step.
- Avoid rebuilding full command-entry objects unless the actual dynamic detail changes.

Completion standard:

- Slash command support stops adding unnecessary work to normal typing.

### Step 2. Decide long-term search index ownership

Decision to make after earlier phases:

Option A:
- Keep search index local to search, but only when active.

Option B:
- Move search index ownership into the shortcuts domain/store and update it incrementally.

Recommendation:

- Prefer Option A first for lower risk.
- Move to Option B only if profiling still shows index maintenance as a top cost after Phase 1 to Phase 3.

## Suggested Execution Order

If we want the best risk-to-reward sequence, use this order:

1. Shrink worker payload.
2. Gate shortcut index maintenance.
3. Extract permission/browser-context hooks.
4. Split `SearchBar` render boundaries.
5. Turn `SearchExperience` into a thin controller composition layer.

This order gets the biggest hot-path wins before larger architectural movement.

## Progress Log

### 2026-04-24

- Created `docs/search-architecture-refactor-plan.md`.
- Captured the current search-architecture refactor direction based on the latest review findings.
- No production code changed in this step.
- No tests or profiler runs were executed in this step.

### 2026-04-24 Follow-up Implementation

- Removed raw `shortcuts` from `SearchSuggestionsComputationInput` and the worker request path.
- Made `buildSearchSuggestionSourceItems()` require the prebuilt `shortcutSearchIndex` so the typing path no longer serializes two shortcut representations.
- Added `shortcutSuggestionsActive` gating in `useSearchSuggestions()` so shortcut index rebuild work only starts while shortcut suggestions are actually active.
- Extracted long-lived search environment concerns into dedicated modules:
  - `src/hooks/useSearchPermissionsState.ts`
  - `src/hooks/useCurrentBrowserTabId.ts`
  - `src/hooks/useSearchBlockingLayerState.ts`
  - `src/components/search/searchSlashCommands.ts`
- Cleaned `SearchExperience` so slash-command permission warmup and permission banners now go through the extracted permission hook instead of duplicated in-component logic.
- Split `SearchBar` into memoized input-shell and suggestions-surface boundaries so suggestion-list churn stops forcing the input shell to re-render in lockstep.
- Verification:
  - `npm run typecheck` passed.
  - `npm test` still fails in `src/components/frosted/frostedSurfacePresets.test.ts` with the same frosted preset expectation mismatch (`lightSurfaceOverlayOpacity` and `sampleBlurPx` related assertions). This appears unrelated to the search refactor.
- No new profiler trace was captured in this implementation step.
