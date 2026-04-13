# Leaftab Grid

A folder-aware desktop-style icon grid extracted from Leaftab.

Leaftab Grid is a desktop-style shortcut grid system built for icon surfaces that need more than simple sortable lists. It supports root-grid reordering, folder grouping, folder-aware drag targets, folder extraction back into the root surface, and shared drag motion behavior between root and folder grids.

## Why it exists

Most open-source drag-and-drop grids stop at plain reordering. Leaftab Grid focuses on the interaction model behind desktop-like shortcut systems:

- reorder icons in a real grid
- drag shortcuts into folders
- reorder items inside folders
- extract items back out of folders
- preserve consistent drag motion across root and folder surfaces
- support span-aware layout behavior for larger folder tiles

## Scope

The first public contract focuses on:

- root shortcut grids
- folder-aware drag and drop
- one folder child level
- pure layout and drag logic
- React adapters for production-style interactions

Current non-goals:

- nested folder interactions
- application-specific dialogs and persistence flows
- unrelated Leaftab home-page UI

## Packages

- `@leaftab/grid-core`
  Pure layout, drag, and domain logic.
- `@leaftab/grid-react`
  React adapters and interaction state for the grid UI.

## Core capabilities

- span-aware grid packing
- drag intent resolution for root shortcuts
- merge and move-into-folder outcomes
- folder reorder and extract outcomes
- shared pointer drag session helpers
- shared FLIP and settle-motion helpers

## Design principles

- desktop-style interactions first
- folder-aware behavior is a first-class feature
- pure domain logic should stay separate from app UI
- host applications own dialogs, persistence, and product policy

## Status

Leaftab Grid is extracted from a production-oriented shortcut surface inside Leaftab and is being shaped into a standalone open-source module.

The current supported interaction model guarantees:

- root shortcuts
- folders with one child level

Nested folders are intentionally outside the first public interaction contract.

## Origin

Leaftab Grid began as the shortcut grid system inside Leaftab.

## License

GPL-3.0-or-later

This stays aligned with the main Leaftab project license.
