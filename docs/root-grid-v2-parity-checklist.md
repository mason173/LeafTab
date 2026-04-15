# Root Grid V2 Parity Checklist

This file is the working parity checklist for the shared root-grid V2 convergence.

V2 is only acceptable when the user-visible behavior matches the current compact-grid contract and the legacy `LeafTab` behavior.

Current interpretation of `V2`:

- shared `leaftab-workspace` root drag engine behavior
- thin host runtime selection in `LeafTab`
- no separate long-lived host-side behavior branch

Primary sources:

- `docs/compact-grid-rules.md`
- `src/features/shortcuts/drag/compactRootDrag.ts`
- `src/components/ShortcutGrid.drag.test.tsx`

## Non-Negotiable Behavior

### 1. Recognition Point

The semantic drag point is the dragged preview body's visual center after preview offsets are applied.

It is not:

- the raw cursor point
- the wrapper-relative pointer point before preview anchoring

This point drives:

- target selection
- merge vs reorder
- claimed-slot retention

### 2. Target Regions

Root targets expose three distinct concepts:

- cell region
- icon region
- icon hit region

The important compact-grid rule is:

- directional merge/reorder classification uses the icon body
- not the full cell body

### 3. Claimed-Slot Latching

Once a reorder slot has yielded, V2 must keep that slot latched across:

- neutral travel
- inter-cell gaps
- backing out of merge zones
- folder entry after a slot was already claimed

This must hold for:

- small folders
- large folders
- vertical travel
- horizontal travel

### 4. Return-Path Stability

Round trips must not randomly re-merge from the wrong side.

If the drag re-enters from a reorder-side path, V2 must stay reorder or neutral until the drag genuinely re-enters the allowed merge side.

### 5. Large Folder Pinning

When dragging a small item:

- large folders are frozen obstacles
- large folders do not get shoved away
- nearby small items may route around the large folder

When dragging the large folder itself:

- the shared reorder pipeline still applies

### 6. Drop Preview Footprint

The drop preview must visually match the icon footprint used by the legacy implementation.

That means:

- use the item's compact preview rect
- do not use the full card height including the title block

It must not degrade into:

- a stretched cell rect
- a flattened placeholder
- a phantom extra-row preview

### 7. Scroll Safety

Auto-scroll is only allowed to change scroll position.

After each scroll tick, V2 must recompute drag semantics from:

- current container scroll
- current content-space pointer
- current snapshot

Visual projection must never become the source of semantic truth.

### 8. Root Merge Placement

When two root icons merge into a new folder:

- the resulting folder must appear in the target icon's slot
- not in the dragged icon's former slot

## Legacy Scenarios That Must Match

These are the minimum parity scenarios already expressed by the legacy test suite:

- keep a large folder visually pinned during a small-item drag session
- do not displace the upper-right icon after crossing a large-folder merge zone into the adjacent gap
- do not displace unrelated icons after crossing a large-folder merge zone into the lower-right gap
- keep the previously claimed vertical slot latched until the next upper target actually yields
- keep the previously claimed slot latched while crossing the next icon gap and backing out of its merge zone
- keep a return-path target in reorder mode while continuing through its icon body after right-edge re-entry
- show the compact drop preview footprint while reordering past the last occupied slot

## Implementation Rule

If V2 behavior differs from this checklist, prefer changing:

- shared semantic resolution
- shared projection derivation
- shared layout contract

Avoid fixing parity with host-only visual patches unless the issue is purely presentational.
