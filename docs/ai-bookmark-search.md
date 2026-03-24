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
- The default embedding model is `paraphrase-multilingual-MiniLM-L12-v2`.
- The repository does not commit the `113 MB` ONNX model binary. By default the extension loads it from a remote model base URL, while `scripts/vendor-bookmark-multilingual-model.sh` remains available for local vendoring.
- ONNX Runtime wasm assets are served from `public/ort`.
- Vector persistence and nearest-neighbor retrieval run on local `PGlite` with the `pgvector` extension, persisted in browser IndexedDB via `idb://...`.
- Index warmup starts automatically once bookmark permission is available.
- Missing or failed semantic indexing automatically falls back to classic bookmark search.

## Module layout

- `src/features/ai-bookmarks/model.ts`
  - local or remote model loading
  - per-model asset base override for cloud-hosted downloads
  - embedding generation
  - future model registry expansion
- `src/features/ai-bookmarks/bookmarks.ts`
  - bookmark tree flattening
  - semantic document generation
- `src/features/ai-bookmarks/storage.ts`
  - `PGlite` bootstrap
  - `pgvector` storage for embeddings and index metadata
  - nearest-neighbor retrieval through SQL
- `src/features/ai-bookmarks/service.ts`
  - index sync
  - semantic retrieval
  - hybrid merge with keyword fallback

## Future extension points

- Add a user-facing settings surface that writes `localStorage["leaftab_ai_bookmark_model_asset_overrides_v1"]`
  so the sandbox can switch model assets between the default remote URL and a custom cloud URL.
- Add an English model beside the multilingual one without changing the search UI.
- Add page fetch enrichment for:
  - page title
  - meta description
  - body preview
- Split the semantic index by language and query route.
- Move long-running indexing into a worker if the bookmark corpus grows.
