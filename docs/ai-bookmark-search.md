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
- Vector persistence and nearest-neighbor retrieval run on local `PGlite` with the `pgvector` extension.
- In extension runtime, IndexedDB stores the persisted semantic index snapshot and the sandbox hydrates a query replica from it before search.
- Index warmup starts automatically once bookmark permission is available.
- Missing or failed semantic indexing automatically falls back to classic bookmark search.

## Module layout

- `src/features/ai-bookmarks/corpus.ts`
  - bookmark tree flattening
  - URL dedupe
  - domain, favicon, folder-path enrichment
  - shared corpus cache and invalidation
- `src/features/ai-bookmarks/model.ts`
  - local or remote model loading
  - per-model asset base override for cloud-hosted downloads
  - embedding generation
  - future model registry expansion
- `src/features/ai-bookmarks/bookmarks.ts`
  - maps shared corpus entries into semantic documents
- `src/features/ai-bookmarks/pageMetadata.ts`
  - opportunistic page fetch enrichment
  - metadata state machine (`pending`, `success`, `empty`, `failed`, `blocked`)
  - retry/backoff policy for background refresh
- `src/features/ai-bookmarks/indexSync.ts`
  - persisted index validation
  - bookmark source-signature comparison
  - model preload
  - index build/save
  - background page metadata refresh
- `src/features/ai-bookmarks/ranker.ts`
  - semantic and lexical hybrid scoring
  - semantic plus keyword merge policy
- `src/features/ai-bookmarks/storage.ts`
  - persisted snapshot reads and writes
  - extension sandbox replica hydration
  - semantic nearest-neighbor search dispatch
- `src/features/ai-bookmarks/statusStore.ts`
  - semantic search warmup and indexing status state
- `src/features/ai-bookmarks/service.ts`
  - query-time orchestration
  - semantic retrieval
  - fallback merge and query cache

## Future extension points

- Add a user-facing settings surface that writes `localStorage["leaftab_ai_bookmark_model_asset_overrides_v1"]`
  so the sandbox can switch model assets between the default remote URL and a custom cloud URL.
- Add an English model beside the multilingual one without changing the search UI.
- Expand page fetch enrichment quality, extraction depth, and per-origin policy if refresh cost becomes noticeable.
- Move long-running indexing into a worker if the bookmark corpus grows.
