# Root Grid Final Refactor Plan

## Why This Exists

The current shortcut drag system is already strong in day-to-day behavior:

- root reorder works
- merge into new folder works
- move into existing folder works
- extract from folder works
- large-folder and small-folder behaviors are established

The main structural weakness is not general drag quality. It is that drag hit-testing, auto-scroll, DOM measurement, and visual projection do not share a single source of truth during scroll-driven drag.

That shows up most clearly in this scenario:

- user drags a root shortcut inside the Drawer
- pointer stays held near the top or bottom edge
- the Drawer auto-scrolls
- visual position and logical target slot drift apart

This plan is for the final version of the system, not a small patch. The goal is to build a drag architecture that stays correct under scroll, folder interactions, and future layout evolution.

## Product-Level Goals

1. Root drag behavior must stay correct while the container auto-scrolls.
2. Folder interactions must remain first-class:
   - reorder in root
   - merge into new folder
   - move into existing folder
   - extract from folder back to root
3. Layout logic must be shareable between the plugin host and `leaftab-workspace`.
4. Old shortcut data must not be lost.
5. Old positions do not need exact migration fidelity. If positions are recomputed, that is acceptable.
6. Host UI animation may change, but drag intent resolution must become deterministic.

## Non-Goals

1. Preserve pixel-perfect behavior of the current drag implementation.
2. Preserve every legacy intermediate animation path.
3. Keep DOM-rect collision as the core drag truth.
4. Ship root and folder rewrites in one big bang.

## Final Design Direction

The final system should move from:

- viewport-based pointer + DOMRect collision + projection-driven inference

to:

- content-space coordinates + slot-based intent resolution + projection as render-only output

In plain terms:

1. All drag intent is resolved in a single scroll-aware coordinate space.
2. Slots are produced by the layout engine, not guessed from current DOM overlap.
3. Auto-scroll only updates scroll state.
4. Drag intent is recomputed from content-space pointer position after every scroll tick.
5. Visual projection never decides logic.

## Core Principles

### 1. Single Source Of Truth For Drag Geometry

The drag engine should use one canonical coordinate system: `content space`.

For any pointer event:

```ts
contentX = clientX - containerViewportRect.left + scrollLeft
contentY = clientY - containerViewportRect.top + scrollTop
```

Everything below should consume `contentX/contentY`, not `clientX/clientY` directly:

- target slot lookup
- before/after resolution
- center merge resolution
- move-into-folder resolution
- extract handoff

### 2. Layout Owns Slots

The layout engine should explicitly generate:

- placed items
- slot rectangles
- item rectangles in content space
- compact/center/folder target regions in content space

React should not infer slot truth from element overlap.

### 3. Auto-Scroll Has Exactly One Owner

The final system should have one auto-scroll owner for root drag.

Recommended owner:

- `workspace-react` root drag controller

Host responsibilities should be reduced to:

- pass the scroll container ref
- optionally disable user wheel scrolling during drag
- style and panel behavior

The host should not also run its own drag auto-scroll loop.

### 4. Intent Resolution And Rendering Must Be Split

The system should have separate layers:

- drag intent resolution
- projection calculation
- visual rendering
- animation

Animations may reflect logic, but must not feed back into logic.

## Target Architecture

### Layer A: `workspace-core/layout`

Responsibility:

- pure layout packing
- slot generation
- content-space rectangles for all interactive regions

Proposed core structures:

```ts
type ContentPoint = { x: number; y: number };

type ContentRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type RootGridSlot = {
  slotIndex: number;
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
  rect: ContentRect;
};

type RootGridDropRegions = {
  cellRect: ContentRect;
  iconRect: ContentRect;
  centerRect?: ContentRect;
  beforeRect: ContentRect;
  afterRect: ContentRect;
  folderEnterRect?: ContentRect;
};

type RootGridPlacedItem = {
  sortId: string;
  shortcutId: string;
  shortcutIndex: number;
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
  itemRect: ContentRect;
  previewRect: ContentRect;
  dropRegions: RootGridDropRegions;
  preserveSlot: boolean;
};

type RootGridLayoutSnapshot = {
  contentWidth: number;
  contentHeight: number;
  slots: RootGridSlot[];
  items: RootGridPlacedItem[];
};
```

Recommended new modules:

- `packages/workspace-core/src/layout/rootGridSnapshot.ts`
- `packages/workspace-core/src/layout/contentRect.ts`
- `packages/workspace-core/src/layout/rootGridDropRegions.ts`

### Layer B: `workspace-core/drag`

Responsibility:

- drag session state
- pointer-to-content conversion
- hover target resolution
- final intent resolution
- projection offsets

Proposed types:

```ts
type DragAnchorRatio = {
  xRatio: number;
  yRatio: number;
};

type RootDragSession = {
  activeSortId: string;
  pointerId: number;
  pointerType: string;
  anchor: DragAnchorRatio;
  sourceRootShortcutId?: string;
};

type RootDragFrameInput = {
  clientPoint: ContentPoint;
  containerViewportRect: ContentRect;
  scrollTop: number;
  scrollLeft: number;
  snapshot: RootGridLayoutSnapshot;
};

type RootDragFrameResult = {
  contentPoint: ContentPoint;
  activePreviewRect: ContentRect;
  interactionIntent: RootShortcutDropIntent | null;
  visualProjectionIntent: RootShortcutDropIntent | null;
  targetIndex: number | null;
  targetSortId: string | null;
  projectionOffsets: Map<string, ProjectionOffset>;
};
```

Recommended new modules:

- `packages/workspace-core/src/drag/rootDragSession.ts`
- `packages/workspace-core/src/drag/rootDragFrame.ts`
- `packages/workspace-core/src/drag/rootDropResolution.ts`
- `packages/workspace-core/src/drag/rootProjection.ts`
- `packages/workspace-core/src/drag/contentSpace.ts`

### Layer C: `workspace-core/autoscroll`

Responsibility:

- compute scroll velocity from pointer proximity to container edges
- clamp to scroll limits
- return next scroll position

No hit-testing should live here.

Proposed API:

```ts
type AutoScrollBounds = {
  top: number;
  bottom: number;
};

type AutoScrollState = {
  velocityY: number;
};

function resolveAutoScrollVelocity(...)
function stepAutoScroll(...)
```

Recommended module:

- `packages/workspace-core/src/drag/rootAutoScroll.ts`

### Layer D: `workspace-react`

Responsibility:

- own pointer listeners
- read container viewport rect and scroll state
- call `workspace-core` pure functions
- render preview, projection, and animations

The React layer should no longer use DOMRect collision as the primary root drag algorithm.

Recommended new modules:

- `packages/workspace-react/src/root/useRootDragController.ts`
- `packages/workspace-react/src/root/useRootAutoScroll.ts`
- `packages/workspace-react/src/root/RootShortcutGridV2.tsx`

## What Stays Stable

To reduce risk, the following should stay conceptually stable:

1. `RootShortcutDropIntent` result shapes
2. `FolderShortcutDropIntent` result shapes
3. `applyShortcutDropIntent`
4. `applyFolderExtractDragStart`
5. existing shortcut tree persistence format
6. shortcut/folder data model

This keeps the refactor focused on geometry, drag resolution, and UI flow rather than rewriting business data operations.

## Data Policy

### Hard Requirement

- Old user shortcut data must still load without loss.

### Accepted Tradeoff

- Existing manual positions may be recomputed when interpreted by the new layout engine.
- If old placement metadata maps imperfectly into the new slot model, the system should normalize into the nearest valid layout rather than trying to preserve unstable geometry.

### Recommended Migration Strategy

1. Reuse the current shortcut tree structure.
2. Recompute layout snapshot at runtime from shortcut order and item span rules.
3. If legacy placement metadata exists, treat it as a hint, not a guarantee.
4. On invalid placement data, normalize rather than fail.

## Rollout Strategy

This should not ship as one giant rewrite. The safest plan is staged replacement.

### Phase 0: Freeze And Baseline

Goals:

- checkpoint current implementation
- document current behaviors
- capture current drag rules in tests before replacing internals

Work:

- keep the checkpoint branch in GitHub
- list canonical root drag behaviors
- add missing regression tests for current stable cases

Exit criteria:

- current baseline is reproducible
- behavior inventory is written down

### Phase 1: Build Root Layout Snapshot In `workspace-core`

Goals:

- create content-space slot model
- create item/drop region generation independent of DOM measurement

Work:

- implement `RootGridLayoutSnapshot`
- generate drop regions for regular icons, small folders, large folders
- preserve current preset-driven item sizing

Exit criteria:

- snapshot can describe current root layout without using browser element rects

### Phase 2: Build Root Drag V2 Engine

Goals:

- resolve hover and drop intent purely from:
  - content-space pointer
  - scroll offsets
  - layout snapshot

Work:

- implement session state
- implement root drag frame computation
- implement reorder, merge, and folder-enter resolution
- implement projection offset generation from logical target slots

Exit criteria:

- root drag decisions no longer depend on live DOM overlap

### Phase 3: Build Root React Controller V2

Goals:

- wire the new engine into the root grid without touching folder drag yet

Work:

- introduce `RootShortcutGridV2`
- drive it from one scroll container owner
- keep the render contract close to current component APIs

Exit criteria:

- root reorder works in both static and auto-scroll scenarios

### Phase 4: Migrate Root Grid To V2 And Keep Folder On Legacy Path

Goals:

- reduce blast radius

Work:

- ship V2 for root only
- keep folder surface on the existing path temporarily
- keep cross-surface extract handoff compatible

Exit criteria:

- the biggest existing pain point is solved without rewriting folder drag yet

### Phase 5: Rebuild Folder Drag On The Same Coordinate System

Goals:

- remove the architectural mismatch between root and folder drag systems

Work:

- build folder content-space snapshot
- migrate folder reorder and extract logic
- unify root/folder handoff under the same coordinate model

Exit criteria:

- all drag surfaces share one geometry philosophy

### Phase 6: Delete Legacy Rect-Collision Root Path

Goals:

- remove drift, dead code, and split-brain behavior

Work:

- remove root DOMRect collision engine
- remove duplicate auto-scroll ownership
- simplify host integrations

Exit criteria:

- root drag uses only V2 path

## Risk Controls

### Guardrail 1: Keep Intent Shapes Stable

Do not change the intent schema while rebuilding geometry. Stable intent shapes dramatically reduce downstream churn.

### Guardrail 2: Root First, Folder Second

The current critical bug is in root drag inside the Drawer. Solve root first and keep folder logic stable until root V2 proves itself.

### Guardrail 3: One Scroll Owner

The host must not run a competing drag auto-scroll loop once root V2 is active.

### Guardrail 4: Prefer Feature Flag Or Swappable Component

The safest implementation path is either:

- `RootShortcutGridV2` behind a feature flag

or:

- both legacy and V2 components living side by side until parity is reached

### Guardrail 5: Projection Is Derived, Never Authoritative

If projection looks right but intent is wrong, intent wins. Rendering should follow logic, not lead it.

## Test Plan

### Unit Tests In `workspace-core`

Add deterministic tests for:

- pointer-to-content conversion
- slot lookup by content point
- reorder target resolution
- center merge resolution
- move-into-folder resolution
- large-folder vs small-folder region rules
- auto-scroll frame updates
- projection offset generation

### Integration Tests In `workspace-react`

Add root grid tests for:

1. reorder without scrolling
2. reorder while auto-scrolling downward
3. reorder while auto-scrolling upward
4. merge while auto-scrolling
5. move into folder while auto-scrolling
6. extraction handoff correctness
7. projection preview consistency with final intent

### Manual QA Scenarios

1. densely packed Drawer root grid
2. many rows requiring multiple viewport heights of scrolling
3. mixed icon + small folder + large folder grid
4. drag hold near bottom edge for several seconds before drop
5. drag hold near top edge after downward scroll, then reverse upward
6. drag over center merge region during active scrolling
7. drag over folder enter region during active scrolling

## Suggested Work Breakdown

### PR 1

- add `workspace-core` content-space primitives
- add root layout snapshot generation
- no UI wiring yet

### PR 2

- add root drag V2 pure logic
- unit tests only

### PR 3

- add `RootShortcutGridV2`
- wire root drag under a local feature flag

### PR 4

- migrate Drawer root grid to V2
- remove host-side competing auto-scroll behavior for root drag

### PR 5

- stabilize root V2 with regression coverage
- start folder V2 design

### PR 6+

- migrate folder drag
- remove root legacy path

## Decision Summary

The final version should not keep trying to patch scroll-time drag errors inside the old rect-collision approach.

The correct long-term direction is:

- preserve existing shortcut data
- keep intent application logic stable
- replace root drag geometry with a content-space slot engine
- roll it out in phases
- only then migrate folder drag

That gives the project a credible path toward a durable, high-end drag system without risking unnecessary churn in already-stable data logic.
