import { getAiProviderById, type AiProviderId } from '@/utils/aiProviders';

const OPEN_AI_CHAT_MESSAGE_TYPE = 'LEAFTAB_OPEN_AI_CHAT';

export type OpenAiProviderChatResult = {
  status: 'opened' | 'filled' | 'sent';
  providerId: AiProviderId;
  tabId?: number;
  error?: string;
};

export function openAiProviderChat(args: {
  providerId: AiProviderId;
  prompt: string;
  autoSend?: boolean;
  noticeMessage?: string;
  noticeTheme?: {
    primaryColor?: string;
    foregroundColor?: string;
  };
}): Promise<OpenAiProviderChatResult> {
  const {
    providerId,
    prompt,
    autoSend = true,
    noticeMessage = '',
    noticeTheme = {},
  } = args;
  const provider = getAiProviderById(providerId);

  if (!provider) {
    return Promise.reject(new Error('unknown_ai_provider'));
  }

  const runtime = globalThis.chrome?.runtime;
  if (!runtime?.sendMessage) {
    window.open(provider.url, '_blank', 'noopener,noreferrer');
    return Promise.resolve({
      status: 'opened',
      providerId,
    });
  }

  return new Promise((resolve) => {
    runtime.sendMessage({
      type: OPEN_AI_CHAT_MESSAGE_TYPE,
      payload: {
        providerId,
        prompt,
        autoSend,
        noticeMessage,
        noticeTheme,
      },
    }, (response: { success?: boolean; result?: OpenAiProviderChatResult; error?: string } | undefined) => {
      const runtimeError = globalThis.chrome?.runtime?.lastError;
      if (runtimeError) {
        window.open(provider.url, '_blank', 'noopener,noreferrer');
        resolve({
          status: 'opened',
          providerId,
          error: runtimeError.message,
        });
        return;
      }

      if (!response?.success || !response.result) {
        window.open(provider.url, '_blank', 'noopener,noreferrer');
        resolve({
          status: 'opened',
          providerId,
          error: response?.error || 'open_ai_provider_failed',
        });
        return;
      }

      resolve(response.result);
    });
  });
}
