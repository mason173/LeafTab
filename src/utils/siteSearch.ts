export type BuiltinSiteShortcut = {
  id: string;
  label: string;
  domain: string;
  url: string;
  aliases: string[];
  keywords?: string[];
};

type BuiltinSiteShortcutSeed = Omit<BuiltinSiteShortcut, 'url'> & {
  url?: string;
};

const BUILTIN_SITE_SHORTCUT_SEEDS: BuiltinSiteShortcutSeed[] = [
  // Developer platforms
  {
    id: 'github',
    label: 'GitHub',
    domain: 'github.com',
    url: 'https://github.com',
    aliases: ['github', 'gh', 'git'],
    keywords: ['code', 'repo', '开源', '代码'],
  },
  {
    id: 'gitlab',
    label: 'GitLab',
    domain: 'gitlab.com',
    url: 'https://gitlab.com',
    aliases: ['gitlab', 'gl', 'lab'],
    keywords: ['repo', 'devops'],
  },
  {
    id: 'gitee',
    label: 'Gitee',
    domain: 'gitee.com',
    url: 'https://gitee.com',
    aliases: ['gitee', '码云', 'maiyun'],
    keywords: ['repo', 'git'],
  },
  {
    id: 'bitbucket',
    label: 'Bitbucket',
    domain: 'bitbucket.org',
    url: 'https://bitbucket.org',
    aliases: ['bitbucket', 'bb'],
    keywords: ['repo', 'git'],
  },
  {
    id: 'stackoverflow',
    label: 'Stack Overflow',
    domain: 'stackoverflow.com',
    url: 'https://stackoverflow.com',
    aliases: ['stackoverflow', 'so', 'stack'],
    keywords: ['qa', '开发问答', '问答'],
  },
  {
    id: 'mdn',
    label: 'MDN',
    domain: 'developer.mozilla.org',
    url: 'https://developer.mozilla.org',
    aliases: ['mdn', 'mozilla'],
    keywords: ['docs', 'javascript', 'css', 'web'],
  },
  {
    id: 'npm',
    label: 'npm',
    domain: 'npmjs.com',
    url: 'https://www.npmjs.com',
    aliases: ['npm', 'npmjs'],
    keywords: ['package', 'node'],
  },
  {
    id: 'pypi',
    label: 'PyPI',
    domain: 'pypi.org',
    url: 'https://pypi.org',
    aliases: ['pypi', 'pip', 'pythonpkg'],
    keywords: ['python', 'package'],
  },
  {
    id: 'juejin',
    label: '掘金',
    domain: 'juejin.cn',
    url: 'https://juejin.cn',
    aliases: ['juejin', '掘金'],
    keywords: ['开发', '技术'],
  },
  {
    id: 'csdn',
    label: 'CSDN',
    domain: 'csdn.net',
    url: 'https://www.csdn.net',
    aliases: ['csdn'],
    keywords: ['博客', '开发', '技术'],
  },
  // AI and research
  {
    id: 'openai',
    label: 'OpenAI',
    domain: 'openai.com',
    url: 'https://openai.com',
    aliases: ['openai', 'oai'],
    keywords: ['ai', 'gpt', 'llm'],
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    domain: 'huggingface.co',
    url: 'https://huggingface.co',
    aliases: ['huggingface', 'hf'],
    keywords: ['model', 'ai'],
  },
  {
    id: 'arxiv',
    label: 'arXiv',
    domain: 'arxiv.org',
    url: 'https://arxiv.org',
    aliases: ['arxiv', 'paper'],
    keywords: ['research', '论文'],
  },
  {
    id: 'scholar',
    label: 'Google Scholar',
    domain: 'scholar.google.com',
    url: 'https://scholar.google.com',
    aliases: ['scholar', 'googlescholar', 'gs'],
    keywords: ['paper', 'citation', '学术'],
  },
  // Search and knowledge
  {
    id: 'google',
    label: 'Google',
    domain: 'google.com',
    url: 'https://www.google.com',
    aliases: ['google', 'gg'],
    keywords: ['search', '搜索'],
  },
  {
    id: 'bing',
    label: 'Bing',
    domain: 'bing.com',
    url: 'https://www.bing.com',
    aliases: ['bing'],
    keywords: ['search', '搜索'],
  },
  {
    id: 'duckduckgo',
    label: 'DuckDuckGo',
    domain: 'duckduckgo.com',
    url: 'https://duckduckgo.com',
    aliases: ['duckduckgo', 'ddg', 'duck'],
    keywords: ['search', 'privacy'],
  },
  {
    id: 'baidu',
    label: 'Baidu',
    domain: 'baidu.com',
    url: 'https://www.baidu.com',
    aliases: ['baidu', 'bd', '百度'],
    keywords: ['search', '搜索'],
  },
  {
    id: 'wikipedia',
    label: 'Wikipedia',
    domain: 'wikipedia.org',
    url: 'https://www.wikipedia.org',
    aliases: ['wiki', 'wikipedia', '维基'],
    keywords: ['百科', 'knowledge'],
  },
  // Content and social
  {
    id: 'youtube',
    label: 'YouTube',
    domain: 'youtube.com',
    url: 'https://www.youtube.com',
    aliases: ['youtube', 'yt'],
    keywords: ['video', '影音'],
  },
  {
    id: 'bilibili',
    label: 'Bilibili',
    domain: 'bilibili.com',
    url: 'https://www.bilibili.com',
    aliases: ['bilibili', 'b站', 'bili'],
    keywords: ['video', '动漫', 'up主'],
  },
  {
    id: 'zhihu',
    label: 'Zhihu',
    domain: 'zhihu.com',
    url: 'https://www.zhihu.com',
    aliases: ['zhihu', '知乎', 'zh'],
    keywords: ['问答', '社区'],
  },
  {
    id: 'weibo',
    label: '微博',
    domain: 'weibo.com',
    url: 'https://weibo.com',
    aliases: ['weibo', '微博', 'wb'],
    keywords: ['social', '社交'],
  },
  {
    id: 'xiaohongshu',
    label: '小红书',
    domain: 'xiaohongshu.com',
    url: 'https://www.xiaohongshu.com',
    aliases: ['xiaohongshu', 'xhs', '小红书'],
    keywords: ['种草', '社区'],
  },
  {
    id: 'douyin',
    label: '抖音',
    domain: 'douyin.com',
    url: 'https://www.douyin.com',
    aliases: ['douyin', 'dy', '抖音'],
    keywords: ['video', '短视频'],
  },
  {
    id: 'x',
    label: 'X',
    domain: 'x.com',
    url: 'https://x.com',
    aliases: ['x', 'twitter', '推特'],
    keywords: ['social', 'news'],
  },
  {
    id: 'reddit',
    label: 'Reddit',
    domain: 'reddit.com',
    url: 'https://www.reddit.com',
    aliases: ['reddit', 'rdt'],
    keywords: ['forum', '社区'],
  },
  // Shopping
  {
    id: 'taobao',
    label: '淘宝',
    domain: 'taobao.com',
    url: 'https://www.taobao.com',
    aliases: ['taobao', 'tb', '淘宝'],
    keywords: ['shop', '购物'],
  },
  {
    id: 'jd',
    label: '京东',
    domain: 'jd.com',
    url: 'https://www.jd.com',
    aliases: ['jd', 'jingdong', '京东'],
    keywords: ['shop', '购物'],
  },
  {
    id: 'amazon',
    label: 'Amazon',
    domain: 'amazon.com',
    url: 'https://www.amazon.com',
    aliases: ['amazon', 'amz'],
    keywords: ['shop', 'shopping'],
  },
];

const BUILTIN_SITE_SHORTCUTS: BuiltinSiteShortcut[] = BUILTIN_SITE_SHORTCUT_SEEDS.map((site) => ({
  ...site,
  url: site.url || `https://${site.domain}`,
}));

function normalizeSiteToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[,:;|]+$/g, '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

function isSubsequenceMatch(candidate: string, query: string): boolean {
  if (!candidate || !query || query.length > candidate.length) return false;
  let i = 0;
  let j = 0;
  while (i < candidate.length && j < query.length) {
    if (candidate[i] === query[j]) j += 1;
    i += 1;
  }
  return j === query.length;
}

function hasOneTypo(candidate: string, query: string): boolean {
  if (!candidate || !query || query.length < 3) return false;
  if (Math.abs(candidate.length - query.length) > 1) return false;
  if (candidate.length === query.length) {
    let diff = 0;
    for (let i = 0; i < candidate.length; i += 1) {
      if (candidate[i] !== query[i]) diff += 1;
      if (diff > 1) return false;
    }
    return diff === 1;
  }
  const longer = candidate.length > query.length ? candidate : query;
  const shorter = candidate.length > query.length ? query : candidate;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < longer.length && j < shorter.length) {
    if (longer[i] === shorter[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    i += 1;
  }
  return true;
}

function isFuzzyTokenMatch(candidate: string, query: string): boolean {
  if (!candidate || !query || query.length < 2) return false;
  if (candidate.includes(query)) return true;
  if (isSubsequenceMatch(candidate, query)) return true;
  return hasOneTypo(candidate, query);
}

function scoreSiteMatch(site: BuiltinSiteShortcut, normalizedQuery: string, fuzzy = true): number {
  const candidates = [
    site.label.toLowerCase(),
    site.domain.toLowerCase(),
    ...site.aliases.map((alias) => alias.toLowerCase()),
    ...(site.keywords || []).map((keyword) => keyword.toLowerCase()),
  ];
  if (candidates.some((candidate) => candidate === normalizedQuery)) return 100;
  if (candidates.some((candidate) => candidate.startsWith(normalizedQuery))) return 80;
  if (candidates.some((candidate) => candidate.includes(normalizedQuery))) return 50;
  if (fuzzy && candidates.some((candidate) => isFuzzyTokenMatch(candidate, normalizedQuery))) return 30;
  return 0;
}

function findSiteByToken(rawToken: string): BuiltinSiteShortcut | null {
  const token = normalizeSiteToken(rawToken);
  if (!token) return null;
  for (const site of BUILTIN_SITE_SHORTCUTS) {
    if (token === site.domain.toLowerCase()) return site;
    if (token === site.id.toLowerCase()) return site;
    if (site.aliases.some((alias) => alias.toLowerCase() === token)) return site;
  }
  return null;
}

export function getBuiltinSiteShortcutSuggestions(
  rawQuery: string,
  limit = 5,
  options?: { fuzzy?: boolean },
): BuiltinSiteShortcut[] {
  const trimmed = rawQuery.trim();
  if (!trimmed) return [];
  if (/\s/.test(trimmed)) return [];
  const normalizedQuery = normalizeSiteToken(trimmed);
  if (!normalizedQuery) return [];
  const fuzzyEnabled = options?.fuzzy ?? true;

  const ranked = BUILTIN_SITE_SHORTCUTS
    .map((site, index) => ({
      site,
      score: scoreSiteMatch(site, normalizedQuery, fuzzyEnabled),
      index,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return ranked.slice(0, Math.max(0, limit)).map((entry) => entry.site);
}

export function parseSiteSearchShortcut(rawQuery: string): {
  query: string;
  siteDomain: string | null;
  historyQuery: string;
} {
  const trimmed = rawQuery.trim();
  if (!trimmed) return { query: '', siteDomain: null, historyQuery: '' };

  const match = trimmed.match(/^(\S+)\s+(.+)$/);
  if (!match) {
    return { query: trimmed, siteDomain: null, historyQuery: trimmed };
  }

  const token = match[1];
  const query = match[2].trim();
  if (!query) return { query: '', siteDomain: null, historyQuery: '' };

  const site = findSiteByToken(token);
  if (!site) {
    return { query: trimmed, siteDomain: null, historyQuery: trimmed };
  }

  return {
    query,
    siteDomain: site.domain,
    historyQuery: `${token} ${query}`,
  };
}

export function buildSiteSearchQuery(siteDomain: string, query: string): string {
  return `site:${siteDomain} ${query}`.trim();
}
