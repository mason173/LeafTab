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

- Shared drag hit-testing, merge bridging, reorder state machines, and other grid interaction behavior must be fixed in `leaftab-grid` first.
- LeafTab host code should stay limited to visuals, parameters, persistence, compatibility, and thin adapters around `@leaftab/grid-react`.
- If a change feels reusable by another app, it belongs in `leaftab-grid`, not in LeafTab host components.
- Read `mason173/leaftab-grid: docs/compact-grid-rules.md` before changing compact drag semantics, and sync `docs/compact-grid-rules.md` after upstream behavior changes.
- Run `npm run grid:verify:host` before merging grid-related changes.
