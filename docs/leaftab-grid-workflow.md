# Leaftab Grid Workflow

This repo now owns the grid engine directly.

## Source Of Truth

Grid behavior lives in these in-repo packages:

- `packages/grid-core`
- `packages/grid-react`
- `packages/grid-preset-leaftab`

The compact drag behavior contract lives here:

- `docs/compact-grid-rules.md`

## Ownership Boundary

Keep shared grid behavior in the package source:

- drag hit-testing
- drag modes and candidate-state policy
- merge bridging
- reorder state transitions
- claimed-slot rules
- folder extraction and folder-surface reorder behavior
- reusable geometry and layout logic
- world-coordinate and serpentine-sequence helpers

Keep product-specific behavior in the host app:

- visuals
- product policy
- dialogs and toasts
- persistence
- thin wrappers in `src/features/shortcuts/components`

## Normal Development

The host app still verifies the boundary before builds:

```bash
npm run grid:verify:host
```

What it checks:

- the local grid packages exist under `packages/`
- the host adapters still point at `@leaftab/workspace-react`
- the old compatibility shim stays thin

## Working On Grid Behavior

1. Edit the package source inside `packages/`.
2. Run `npm run dev` or `npm run build:community` from the repo root.
3. If needed, build package outputs explicitly with `npm run grid:build:local`.

When a React package consumes new exports from `@leaftab/workspace-core`:

1. rebuild the local grid packages if needed with `npm run grid:build:local`
2. then run the host app or package tests again so `workspace-react` does not keep using stale `dist/` output

There is no separate `leaftab-workspace` repo or vendor tarball refresh step anymore.
