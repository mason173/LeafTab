# AI Bookmark Search Architecture

## Goal

Build a read-only AI sidecar index for browser bookmarks. The browser bookmark tree remains the source of truth and sync remains untouched.

## Current MVP shape

- Search entry stays on the existing bookmark command path (`/b`).
- Classic bookmark keyword search remains the fallback path.
- AI search adds a local semantic index built from:
  - bookmark title
  - URL
  - domain
  - folder path
  - opportunistic page title
  - opportunistic meta description
  - opportunistic body preview
- The Chinese embedding model is treated as a local static asset under `public/models/bge-small-zh-v1.5`.
- ONNX Runtime wasm assets are served from `public/ort`.
- Index warmup starts automatically once bookmark permission is available.
- Missing or failed semantic indexing automatically falls back to classic bookmark search.

## Module layout

- `src/features/ai-bookmarks/model.ts`
  - local model loading
  - embedding generation
  - future model registry expansion
- `src/features/ai-bookmarks/bookmarks.ts`
  - bookmark tree flattening
  - semantic document generation
- `src/features/ai-bookmarks/storage.ts`
  - IndexedDB persistence for vectors and index metadata
- `src/features/ai-bookmarks/service.ts`
  - index sync
  - semantic retrieval
  - hybrid merge with keyword fallback

## Future extension points

- Add an English model beside the Chinese one without changing the search UI.
- Add page fetch enrichment for:
  - page title
  - meta description
  - body preview
- Split the semantic index by language and query route.
- Move long-running indexing into a worker if the bookmark corpus grows.
