import type { AiBookmarkModelId } from '@/features/ai-bookmarks/types';
import {
  AI_BOOKMARK_MODEL_ASSET_OVERRIDE_QUERY_PARAM,
  AI_BOOKMARK_MODEL_ASSET_OVERRIDE_STORAGE_KEY,
} from '@/features/ai-bookmarks/constants';
import {
  AI_BOOKMARK_SANDBOX_EMBED_TYPE,
  AI_BOOKMARK_SANDBOX_READY_TYPE,
  AI_BOOKMARK_SANDBOX_STORAGE_TYPE,
  type AiBookmarkSandboxEmbedRequest,
  type AiBookmarkSandboxEmbedResponse,
  type AiBookmarkSandboxStorageRequest,
  type AiBookmarkSandboxStorageResponse,
} from '@/features/ai-bookmarks/sandboxShared';
import { isExtensionRuntime, getExtensionRuntime } from '@/platform/runtime';

let sandboxFramePromise: Promise<HTMLIFrameElement> | null = null;

function isAiSandboxPage(): boolean {
  if (typeof window === 'undefined') return false;
  return /\/ai-sandbox\.html$/i.test(window.location.pathname);
}

function resolveSandboxUrl(): string {
  let query = '';
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(AI_BOOKMARK_MODEL_ASSET_OVERRIDE_STORAGE_KEY) || '';
      if (raw) {
        query = `?${new URLSearchParams({
          [AI_BOOKMARK_MODEL_ASSET_OVERRIDE_QUERY_PARAM]: raw,
        }).toString()}`;
      }
    } catch {}
  }

  if (typeof window !== 'undefined') {
    return `ai-sandbox.html${query}`;
  }
  const runtime = getExtensionRuntime();
  if (runtime?.getURL) return `${runtime.getURL('ai-sandbox.html')}${query}`;
  return `/ai-sandbox.html${query}`;
}

function ensureSandboxFrame(): Promise<HTMLIFrameElement> {
  if (sandboxFramePromise) return sandboxFramePromise;

  sandboxFramePromise = new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.src = resolveSandboxUrl();
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.position = 'fixed';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';

    let settled = false;
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('ai_bookmark_sandbox_timeout'));
    }, 10_000);

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) return;
      if (event.data?.type !== AI_BOOKMARK_SANDBOX_READY_TYPE) return;
      cleanup();
      settled = true;
      resolve(frame);
    };

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('message', handleMessage);
      frame.removeEventListener('error', handleError);
    };

    const handleError = () => {
      cleanup();
      reject(new Error('ai_bookmark_sandbox_load_failed'));
    };

    window.addEventListener('message', handleMessage);
    frame.addEventListener('error', handleError);
    document.body.appendChild(frame);

    frame.addEventListener('load', () => {
      if (settled) return;
      // The sandbox page announces readiness asynchronously after its module graph loads.
    }, { once: true });
  }).catch((error) => {
    sandboxFramePromise = null;
    throw error;
  });

  return sandboxFramePromise;
}

async function requestSandboxMessage<TResponse>(
  type: string,
  payload: unknown,
): Promise<TResponse> {
  const frame = await ensureSandboxFrame();

  return new Promise<TResponse>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeoutId = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error('ai_bookmark_sandbox_request_timeout'));
    }, 30_000);

    channel.port1.onmessage = (event: MessageEvent<TResponse>) => {
      window.clearTimeout(timeoutId);
      channel.port1.close();
      resolve(event.data);
    };

    frame.contentWindow?.postMessage(
      {
        type,
        payload,
      },
      '*',
      [channel.port2],
    );
  });
}

async function requestSandboxEmbeddings(
  payload: AiBookmarkSandboxEmbedRequest,
): Promise<number[][]> {
  const response = await requestSandboxMessage<AiBookmarkSandboxEmbedResponse>(
    AI_BOOKMARK_SANDBOX_EMBED_TYPE,
    payload,
  );
  if (response?.ok) return response.embeddings;
  throw new Error(response?.error || 'ai_bookmark_sandbox_request_failed');
}

export async function requestBookmarkStorageWithSandbox(
  payload: AiBookmarkSandboxStorageRequest,
): Promise<AiBookmarkSandboxStorageResponse> {
  if (isAiSandboxPage()) {
    const storage = await import('@/features/ai-bookmarks/storageBackend');
    try {
      switch (payload.operation) {
        case 'read-index-entries':
          return {
            ok: true,
            operation: 'read-index-entries',
            entries: await storage.readBookmarkSemanticIndexEntries(),
          };
        case 'read-index-meta':
          return {
            ok: true,
            operation: 'read-index-meta',
            meta: await storage.readBookmarkSemanticIndexMeta(),
          };
        case 'replace-index':
          await storage.replaceBookmarkSemanticIndex({
            entries: payload.entries,
            meta: payload.meta,
          });
          return {
            ok: true,
            operation: 'replace-index',
          };
        case 'clear-index':
          await storage.clearBookmarkSemanticIndex();
          return {
            ok: true,
            operation: 'clear-index',
          };
        case 'search-index':
          return {
            ok: true,
            operation: 'search-index',
            entries: await storage.searchBookmarkSemanticIndex({
              embeddingModel: payload.embeddingModel,
              queryEmbedding: payload.queryEmbedding,
              limit: payload.limit,
            }),
          };
      }
    } catch (error) {
      return {
        ok: false,
        error: String((error as Error)?.message || error || 'ai_bookmark_sandbox_request_failed'),
      };
    }
  }

  return requestSandboxMessage<AiBookmarkSandboxStorageResponse>(
    AI_BOOKMARK_SANDBOX_STORAGE_TYPE,
    payload,
  );
}

export async function embedTextsWithBookmarkModel(args: {
  modelId: AiBookmarkModelId;
  texts: string[];
  isQuery?: boolean;
}): Promise<number[][]> {
  if (!isExtensionRuntime() || isAiSandboxPage()) {
    const { embedTextsWithBookmarkModel: embedDirectly } = await import('@/features/ai-bookmarks/model');
    return embedDirectly(args);
  }

  return requestSandboxEmbeddings({
    modelId: args.modelId,
    texts: args.texts,
    isQuery: args.isQuery,
  });
}
