import type { AiBookmarkModelId } from '@/features/ai-bookmarks/types';

export const AI_BOOKMARK_SANDBOX_READY_TYPE = 'leaftab-ai-bookmarks:sandbox-ready';
export const AI_BOOKMARK_SANDBOX_EMBED_TYPE = 'leaftab-ai-bookmarks:embed';

export type AiBookmarkSandboxEmbedRequest = {
  modelId: AiBookmarkModelId;
  texts: string[];
  isQuery?: boolean;
};

export type AiBookmarkSandboxEmbedResponse =
  | {
      ok: true;
      embeddings: number[][];
    }
  | {
      ok: false;
      error: string;
    };
