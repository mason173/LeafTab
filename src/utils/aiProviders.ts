export type AiProviderId =
  | 'chatgpt'
  | 'gemini'
  | 'claude'
  | 'grok'
  | 'kimi'
  | 'perplexity'
  | 'doubao'
  | 'deepseek'
  | 'qwen'
  | 'yuanbao'
  | 'copilot';

export type AiProviderDefinition = {
  id: AiProviderId;
  label: string;
  url: string;
  detail: string;
  accentColor: string;
  keywords: string[];
};

export const AI_PROVIDER_DEFINITIONS: readonly AiProviderDefinition[] = [
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    url: 'https://chatgpt.com/',
    detail: 'chatgpt.com',
    accentColor: '#10A37F',
    keywords: ['chatgpt', 'openai', 'gpt', 'chat gpt', '查特', 'chat'],
  },
  {
    id: 'gemini',
    label: 'Gemini',
    url: 'https://gemini.google.com/app',
    detail: 'gemini.google.com',
    accentColor: '#4285F4',
    keywords: ['gemini', 'google ai', 'bard', '谷歌', 'google', '双子座'],
  },
  {
    id: 'claude',
    label: 'Claude',
    url: 'https://claude.ai/new',
    detail: 'claude.ai',
    accentColor: '#D97757',
    keywords: ['claude', 'anthropic', '克劳德', '小克', 'claude ai'],
  },
  {
    id: 'grok',
    label: 'Grok',
    url: 'https://grok.com/',
    detail: 'grok.com',
    accentColor: '#111111',
    keywords: ['grok', 'xai', 'x ai', 'grok ai'],
  },
  {
    id: 'kimi',
    label: 'Kimi',
    url: 'https://www.kimi.com/',
    detail: 'kimi.com',
    accentColor: '#1E88E5',
    keywords: ['kimi', 'moonshot', 'moonshot ai', '月之暗面'],
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    url: 'https://www.perplexity.ai/',
    detail: 'perplexity.ai',
    accentColor: '#0F172A',
    keywords: ['perplexity', 'pplx', '搜索问答', '联网问答'],
  },
  {
    id: 'doubao',
    label: '豆包',
    url: 'https://www.doubao.com/chat/',
    detail: 'doubao.com',
    accentColor: '#2563EB',
    keywords: ['doubao', '豆包', '字节', 'bytedance'],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    url: 'https://chat.deepseek.com/',
    detail: 'chat.deepseek.com',
    accentColor: '#4F46E5',
    keywords: ['deepseek', 'deep seek', '深度求索', 'ds'],
  },
  {
    id: 'qwen',
    label: '通义千问',
    url: 'https://chat.qwen.ai/',
    detail: 'chat.qwen.ai',
    accentColor: '#7C3AED',
    keywords: ['qwen', 'tongyi', 'tongyi qianwen', '通义', '千问', '阿里'],
  },
  {
    id: 'yuanbao',
    label: '腾讯元宝',
    url: 'https://yuanbao.tencent.com/',
    detail: 'yuanbao.tencent.com',
    accentColor: '#0EA5E9',
    keywords: ['yuanbao', '腾讯元宝', '元宝', 'tencent ai', '腾讯'],
  },
  {
    id: 'copilot',
    label: 'Copilot',
    url: 'https://copilot.microsoft.com/',
    detail: 'copilot.microsoft.com',
    accentColor: '#2563EB',
    keywords: ['copilot', 'microsoft copilot', '微软', 'copilot ai'],
  },
] as const;

const AI_PROVIDER_MAP = new Map<AiProviderId, AiProviderDefinition>(
  AI_PROVIDER_DEFINITIONS.map((provider) => [provider.id, provider]),
);

export function getAiProviderById(providerId: AiProviderId | null | undefined): AiProviderDefinition | null {
  if (!providerId) return null;
  return AI_PROVIDER_MAP.get(providerId) ?? null;
}
