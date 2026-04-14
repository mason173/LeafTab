# Compact Grid Rules

This file mirrors the current compact-grid behavior contract consumed by `LeafTab`.

Canonical source of truth:

- `mason173/leaftab-grid: docs/compact-grid-rules.md`

If behavior changes:

1. update `leaftab-grid` first
2. update this mirror second

## Scope

`LeafTab` now runs a compact-only shortcut grid.

The host app keeps:

- visuals
- layout inputs
- host policy
- persistence
- compatibility wrappers

The behavior engine lives in `@leaftab/grid-react`.

## Core Terms

### Recognition Point

The grid does not use the raw cursor as the authoritative drag point.

It uses the dragged icon body's visual center after preview offsets are applied. That recognition point drives:

- target selection
- edge classification
- merge vs reorder state

### Target Regions

Each target exposes:

- `targetCellRegion`
- `targetIconRegion`
- `targetIconHitRegion`

Important rule:

> target edges are the icon body's edges, not the full cell edges

### Intents

The runtime separates:

- `interactionIntent`
- `visualProjectionIntent`

The UI may keep showing an older projected slot even after the semantic interaction has moved on to folder entry or merge. That separation is intentional and prevents flicker.

## Root Behavior

The root grid can resolve:

- `reorder-root`
- `merge-root-shortcuts`
- `move-root-shortcut-into-folder`

When dragging over a target:

- icon-body contact on the merge side creates merge or move-into-folder behavior
- contact on the reorder side creates yield and displacement
- travel through neutral space should preserve the previous valid claim instead of thrashing

## Directional Contract

Current directional rules:

| Target relative to dragged origin | Merge / move-into-folder edges | Reorder / yield edges |
| --- | --- | --- |
| Above | `right`, `bottom` | `left`, `top` |
| Below | `left`, `top` | `right`, `bottom` |
| Left on same row | `right`, `bottom` | `left`, `top` |
| Right on same row | `left`, `top` | `right`, `bottom` |

This is the rule set behind the compact grid's stable round-trip behavior.

## Three Zones

The recognition point classifies each target into:

- `merge`
  Inside the target icon body.
- `neutral`
  Outside the icon body, but nearest to merge-side edges.
- `reorder`
  Outside the icon body, nearest to reorder-side edges.

Meaning:

- `merge` can produce folder entry or merge
- `neutral` should not create a new yield on its own
- `reorder` is what creates displacement and a claimed slot

## Claimed Slots And Bridge Preservation

Once the grid has already yielded a reorder slot, that slot can stay latched across:

- the target cell outside the merge side
- the gap between source and target
- the gap between one yielded target and the next candidate
- neutral travel while backing out
- folder entry after a slot is already claimed

So if a drag has already claimed slot `B` and then enters another folder target:

- semantic interaction may become `move-root-shortcut-into-folder`
- visual projection should still stay on slot `B`

That is true for both:

- small folders
- large folders

## Return-Path Contract

Round trips are not allowed to randomly re-merge targets from the wrong side.

The intended contract is:

- a target only re-enters merge when the icon body is entered from its allowed merge side
- returning through reorder-side or outside edges should stay reorder or neutral
- previously claimed slots stay visually latched until a new target truly yields or the drag returns to source

## Folder Surface

Inside a folder, the engine uses reorder-only behavior.

Folder-internal drag behavior supports:

- `reorder-folder-shortcuts`
- extraction back to the root surface

It does not support:

- merge inside the folder
- move-into-folder inside the folder

But it still inherits the same stability principles:

- inter-cell gaps should not target unrelated neighbors
- yielded slots should not collapse too early
- reorder should not oscillate while traveling through neutral space

## Variable-Span Layout

Large folders participate in the same packed reorder model as every other root item.

Current product contract:

- all root items share one packed layout
- reorder targets are derived from projected occupancy
- span-aware reorder activates when any item spans multiple rows or columns
- large folders are not a separate behavior engine

When dragging a small item:

- large folders act as frozen obstacles
- small items can move around them
- small items should not shove large folders away

When dragging the large folder itself:

- it still uses the same shared reorder pipeline

## Host Boundary

Before changing any drag behavior in `LeafTab`, check:

- `docs/leaftab-grid-workflow.md`
- `mason173/leaftab-grid: docs/compact-grid-rules.md`

If the change is about:

- drag hit-testing
- merge bridging
- reorder state transitions
- claimed-slot rules
- folder reorder engine behavior
- span-aware reorder

then it belongs upstream in `leaftab-grid`, not in host-only code.
