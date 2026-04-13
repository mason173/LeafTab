# Leaftab Grid Workflow

This document keeps `Leaftab` and `leaftab-grid` from drifting apart.

## Source Of Truth

The rule is simple:

> shared grid behavior changes land in `leaftab-grid` first

That includes:

- drag and reorder rules
- merge and folder extraction behavior
- drop preview and settle behavior
- reusable grid math and layout logic
- reusable React grid adapters

Keep these in `Leaftab`:

- visuals
- product policy
- dialogs and toasts
- persistence
- thin host wrappers around `@leaftab/grid-react`

## Normal Development

`Leaftab` now checks grid integration before builds:

```bash
npm run grid:verify:host
```

What it does:

- detects whether `Leaftab` is using local `file:` grid packages or published package versions
- builds the local `leaftab-grid` workspace automatically when local `file:` dependencies are active
- verifies that the host adapters still point at `@leaftab/grid-react`
- verifies that the old in-app compatibility shim has stayed thin

## Recommended Change Order

If you are changing shared grid behavior:

1. Edit `/Users/mason/Desktop/leaftab-grid`
2. Run `cd /Users/mason/Desktop/leaftab-grid && npm run verify`
3. Run `cd /Users/mason/Desktop/Leaftab && npm run build:community`
4. Commit the grid repo first
5. Commit the host-app adaptation second

If you are changing only visuals or product policy:

1. Edit `Leaftab`
2. Keep the shared package APIs stable if possible
3. Run `npm run build:community`

## Dependency Modes

Current default mode uses published GitHub release tarballs:

- `npm run grid:check:published`

Local co-development is still supported when you intentionally switch back to local dependencies:

- `npm run grid:check:local`

The important rule is consistency:

- do not mix local and published grid package sources
- keep both `@leaftab/grid-core` and `@leaftab/grid-react` on the same source mode

## Anti-Fork Guardrails

If a future change feels like "grid engine behavior", treat that as a package change, not a host-app change.

The easiest smell test is:

- if another app could reuse the behavior, it belongs in `leaftab-grid`
- if it is only about how Leaftab looks or behaves as a product, it belongs in `Leaftab`
