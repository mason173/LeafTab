# Contributing

Thanks for your interest in contributing to LeafTab.

## Development

- Install dependencies: `npm i`
- Start dev server: `npm run dev`
- Build: `npm run build`

## Pull Requests

- Keep changes focused and small when possible
- Ensure `npm run build` passes
- Describe what changed and why

## Grid Ownership

- Shared drag hit-testing, merge bridging, reorder state machines, and other grid interaction behavior now lives in this repo under `packages/`.
- LeafTab host code should stay limited to visuals, parameters, persistence, compatibility, and thin adapters around `@leaftab/workspace-react`.
- If a change is truly grid-engine behavior, change the local package source first:
  - `packages/grid-core`
  - `packages/grid-react`
  - `packages/grid-preset-leaftab`
- Read `docs/compact-grid-rules.md` before changing compact drag semantics.
- Run `npm run grid:verify:host` before merging grid-related changes.
