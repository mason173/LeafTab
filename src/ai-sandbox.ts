import { embedTextsWithBookmarkModel, preloadBookmarkModel } from '@/features/ai-bookmarks/model';
import {
  AI_BOOKMARK_SANDBOX_EMBED_TYPE,
  AI_BOOKMARK_SANDBOX_PRELOAD_TYPE,
  AI_BOOKMARK_SANDBOX_READY_TYPE,
  AI_BOOKMARK_SANDBOX_STORAGE_TYPE,
  type AiBookmarkSandboxEmbedRequest,
  type AiBookmarkSandboxEmbedProgressEvent,
  type AiBookmarkSandboxEmbedResponse,
  type AiBookmarkSandboxPreloadRequest,
  type AiBookmarkSandboxPreloadResponse,
  type AiBookmarkSandboxStorageRequest,
  type AiBookmarkSandboxStorageResponse,
} from '@/features/ai-bookmarks/sandboxShared';

function postReady() {
  if (window.parent === window) return;
  try {
    window.parent?.postMessage({ type: AI_BOOKMARK_SANDBOX_READY_TYPE }, '*');
  } catch {
    // The sandbox may be opened standalone during debugging.
  }
}

window.addEventListener('message', (event: MessageEvent<{ type?: string; payload?: AiBookmarkSandboxEmbedRequest }>) => {
  if (event.data?.type !== AI_BOOKMARK_SANDBOX_EMBED_TYPE) return;

  const port = event.ports?.[0];
  const payload = event.data.payload;
  if (!port || !payload) return;

  (async () => {
    let response: AiBookmarkSandboxEmbedResponse;

    try {
      const embeddings = await embedTextsWithBookmarkModel({
        ...payload,
        onProgress: (progress) => {
          port.postMessage({
            kind: 'progress',
            progress: progress.progress,
            label: progress.label,
          } satisfies AiBookmarkSandboxEmbedProgressEvent);
        },
      });
      response = {
        kind: 'result',
        ok: true,
        embeddings,
      };
    } catch (error) {
      response = {
        kind: 'result',
        ok: false,
        error: String((error as Error)?.message || error || 'ai_bookmark_sandbox_embed_failed'),
      };
    }

    port.postMessage(response);
    port.close();
  })().catch(() => {
    port.postMessage({
      kind: 'result',
      ok: false,
      error: 'ai_bookmark_sandbox_embed_failed',
    } satisfies AiBookmarkSandboxEmbedResponse);
    port.close();
  });
});

window.addEventListener('message', (event: MessageEvent<{ type?: string; payload?: AiBookmarkSandboxPreloadRequest }>) => {
  if (event.data?.type !== AI_BOOKMARK_SANDBOX_PRELOAD_TYPE) return;

  const port = event.ports?.[0];
  const payload = event.data.payload;
  if (!port || !payload) return;

  (async () => {
    let response: AiBookmarkSandboxPreloadResponse;

    try {
      await preloadBookmarkModel({
        modelId: payload.modelId,
        onProgress: (progress) => {
          port.postMessage({
            kind: 'progress',
            progress: progress.progress,
            label: progress.label,
          } satisfies AiBookmarkSandboxEmbedProgressEvent);
        },
      });
      response = {
        kind: 'result',
        ok: true,
      };
    } catch (error) {
      response = {
        kind: 'result',
        ok: false,
        error: String((error as Error)?.message || error || 'ai_bookmark_sandbox_preload_failed'),
      };
    }

    port.postMessage(response);
    port.close();
  })().catch(() => {
    port.postMessage({
      kind: 'result',
      ok: false,
      error: 'ai_bookmark_sandbox_preload_failed',
    } satisfies AiBookmarkSandboxPreloadResponse);
    port.close();
  });
});

window.addEventListener('message', (event: MessageEvent<{ type?: string; payload?: AiBookmarkSandboxStorageRequest }>) => {
  if (event.data?.type !== AI_BOOKMARK_SANDBOX_STORAGE_TYPE) return;

  const port = event.ports?.[0];
  const payload = event.data.payload;
  if (!port || !payload) return;

  (async () => {
    let response: AiBookmarkSandboxStorageResponse;

    try {
      const storage = await import('@/features/ai-bookmarks/storageBackend');

      switch (payload.operation) {
        case 'read-index-entries':
          response = {
            ok: true,
            operation: 'read-index-entries',
            entries: await storage.readBookmarkSemanticIndexEntries(),
          };
          break;
        case 'read-index-meta':
          response = {
            ok: true,
            operation: 'read-index-meta',
            meta: await storage.readBookmarkSemanticIndexMeta(),
          };
          break;
        case 'replace-index':
          await storage.replaceBookmarkSemanticIndex({
            entries: payload.entries,
            meta: payload.meta,
          });
          response = {
            ok: true,
            operation: 'replace-index',
          };
          break;
        case 'clear-index':
          await storage.clearBookmarkSemanticIndex();
          response = {
            ok: true,
            operation: 'clear-index',
          };
          break;
        case 'search-index':
          response = {
            ok: true,
            operation: 'search-index',
            entries: await storage.searchBookmarkSemanticIndex({
              embeddingModel: payload.embeddingModel,
              queryEmbedding: payload.queryEmbedding,
              limit: payload.limit,
            }),
          };
          break;
      }
    } catch (error) {
      response = {
        ok: false,
        error: String((error as Error)?.message || error || 'ai_bookmark_sandbox_storage_failed'),
      };
    }

    port.postMessage(response);
    port.close();
  })().catch(() => {
    port.postMessage({
      ok: false,
      error: 'ai_bookmark_sandbox_storage_failed',
    } satisfies AiBookmarkSandboxStorageResponse);
    port.close();
  });
});

postReady();
