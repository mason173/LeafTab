import type { AiBookmarkModelId } from '@/features/ai-bookmarks/types';
import {
  AI_BOOKMARK_SANDBOX_EMBED_TYPE,
  AI_BOOKMARK_SANDBOX_READY_TYPE,
  type AiBookmarkSandboxEmbedRequest,
  type AiBookmarkSandboxEmbedResponse,
} from '@/features/ai-bookmarks/sandboxShared';
import { isExtensionRuntime, getExtensionRuntime } from '@/platform/runtime';

let sandboxFramePromise: Promise<HTMLIFrameElement> | null = null;

function resolveSandboxUrl(): string {
  const runtime = getExtensionRuntime();
  if (runtime?.getURL) return runtime.getURL('ai-sandbox.html');
  return new URL('/ai-sandbox.html', window.location.href).toString();
}

function ensureSandboxFrame(): Promise<HTMLIFrameElement> {
  if (sandboxFramePromise) return sandboxFramePromise;

  sandboxFramePromise = new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.src = resolveSandboxUrl();
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

async function requestSandboxEmbeddings(
  payload: AiBookmarkSandboxEmbedRequest,
): Promise<number[][]> {
  const frame = await ensureSandboxFrame();

  return new Promise<number[][]>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeoutId = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error('ai_bookmark_sandbox_request_timeout'));
    }, 30_000);

    channel.port1.onmessage = (event: MessageEvent<AiBookmarkSandboxEmbedResponse>) => {
      window.clearTimeout(timeoutId);
      channel.port1.close();

      const response = event.data;
      if (response?.ok) {
        resolve(response.embeddings);
        return;
      }

      reject(new Error(response?.error || 'ai_bookmark_sandbox_request_failed'));
    };

    frame.contentWindow?.postMessage(
      {
        type: AI_BOOKMARK_SANDBOX_EMBED_TYPE,
        payload,
      },
      '*',
      [channel.port2],
    );
  });
}

export async function embedTextsWithBookmarkModel(args: {
  modelId: AiBookmarkModelId;
  texts: string[];
  isQuery?: boolean;
}): Promise<number[][]> {
  if (!isExtensionRuntime()) {
    const { embedTextsWithBookmarkModel: embedDirectly } = await import('@/features/ai-bookmarks/model');
    return embedDirectly(args);
  }

  return requestSandboxEmbeddings({
    modelId: args.modelId,
    texts: args.texts,
    isQuery: args.isQuery,
  });
}
