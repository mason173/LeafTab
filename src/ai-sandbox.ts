import { embedTextsWithBookmarkModel } from '@/features/ai-bookmarks/model';
import {
  AI_BOOKMARK_SANDBOX_EMBED_TYPE,
  AI_BOOKMARK_SANDBOX_READY_TYPE,
  type AiBookmarkSandboxEmbedRequest,
  type AiBookmarkSandboxEmbedResponse,
} from '@/features/ai-bookmarks/sandboxShared';

function postReady() {
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
      const embeddings = await embedTextsWithBookmarkModel(payload);
      response = {
        ok: true,
        embeddings,
      };
    } catch (error) {
      response = {
        ok: false,
        error: String((error as Error)?.message || error || 'ai_bookmark_sandbox_embed_failed'),
      };
    }

    port.postMessage(response);
    port.close();
  })().catch(() => {
    port.postMessage({
      ok: false,
      error: 'ai_bookmark_sandbox_embed_failed',
    } satisfies AiBookmarkSandboxEmbedResponse);
    port.close();
  });
});

postReady();
