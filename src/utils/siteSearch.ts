export type BuiltinSiteShortcut = {
  id: string;
  label: string;
  domain: string;
  url: string;
  searchUrlTemplate?: string;
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
    searchUrlTemplate: 'https://github.com/search?q=%s',
    aliases: ['github', 'gh', 'git'],
    keywords: ['code', 'repo', '开源', '代码'],
  },
  {
    id: 'gitlab',
    label: 'GitLab',
    domain: 'gitlab.com',
    url: 'https://gitlab.com',
    searchUrlTemplate: 'https://gitlab.com/search?search=%s',
    aliases: ['gitlab', 'gl', 'lab'],
    keywords: ['repo', 'devops'],
  },
  {
    id: 'gitee',
    label: 'Gitee',
    domain: 'gitee.com',
    url: 'https://gitee.com',
    searchUrlTemplate: 'https://search.gitee.com/?q=%s',
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
    searchUrlTemplate: 'https://stackoverflow.com/search?q=%s',
    aliases: ['stackoverflow', 'so', 'stack'],
    keywords: ['qa', '开发问答', '问答'],
  },
  {
    id: 'mdn',
    label: 'MDN',
    domain: 'developer.mozilla.org',
    url: 'https://developer.mozilla.org',
    searchUrlTemplate: 'https://developer.mozilla.org/search?q=%s',
    aliases: ['mdn', 'mozilla'],
    keywords: ['docs', 'javascript', 'css', 'web'],
  },
  {
    id: 'npm',
    label: 'npm',
    domain: 'npmjs.com',
    url: 'https://www.npmjs.com',
    searchUrlTemplate: 'https://www.npmjs.com/search?q=%s',
    aliases: ['npm', 'npmjs'],
    keywords: ['package', 'node'],
  },
  {
    id: 'pypi',
    label: 'PyPI',
    domain: 'pypi.org',
    url: 'https://pypi.org',
    searchUrlTemplate: 'https://pypi.org/search/?q=%s',
    aliases: ['pypi', 'pip', 'pythonpkg'],
    keywords: ['python', 'package'],
  },
  {
    id: 'juejin',
    label: '掘金',
    domain: 'juejin.cn',
    url: 'https://juejin.cn',
    searchUrlTemplate: 'https://juejin.cn/search?query=%s',
    aliases: ['juejin', '掘金'],
    keywords: ['开发', '技术'],
  },
  {
    id: 'csdn',
    label: 'CSDN',
    domain: 'csdn.net',
    url: 'https://www.csdn.net',
    searchUrlTemplate: 'https://so.csdn.net/so/search?q=%s',
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
    searchUrlTemplate: 'https://huggingface.co/search/full-text?q=%s',
    aliases: ['huggingface', 'hf'],
    keywords: ['model', 'ai'],
  },
  {
    id: 'arxiv',
    label: 'arXiv',
    domain: 'arxiv.org',
    url: 'https://arxiv.org',
    searchUrlTemplate: 'https://arxiv.org/search/?query=%s&searchtype=all',
    aliases: ['arxiv', 'paper'],
    keywords: ['research', '论文'],
  },
  {
    id: 'scholar',
    label: 'Google Scholar',
    domain: 'scholar.google.com',
    url: 'https://scholar.google.com',
    searchUrlTemplate: 'https://scholar.google.com/scholar?q=%s',
    aliases: ['scholar', 'googlescholar', 'gs'],
    keywords: ['paper', 'citation', '学术'],
  },
  // Search and knowledge
  {
    id: 'google',
    label: 'Google',
    domain: 'google.com',
    url: 'https://www.google.com',
    searchUrlTemplate: 'https://www.google.com/search?q=%s',
    aliases: ['google', 'gg'],
    keywords: ['search', '搜索'],
  },
  {
    id: 'bing',
    label: 'Bing',
    domain: 'bing.com',
    url: 'https://www.bing.com',
    searchUrlTemplate: 'https://www.bing.com/search?q=%s',
    aliases: ['bing'],
    keywords: ['search', '搜索'],
  },
  {
    id: 'duckduckgo',
    label: 'DuckDuckGo',
    domain: 'duckduckgo.com',
    url: 'https://duckduckgo.com',
    searchUrlTemplate: 'https://duckduckgo.com/?q=%s',
    aliases: ['duckduckgo', 'ddg', 'duck'],
    keywords: ['search', 'privacy'],
  },
  {
    id: 'baidu',
    label: 'Baidu',
    domain: 'baidu.com',
    url: 'https://www.baidu.com',
    searchUrlTemplate: 'https://www.baidu.com/s?wd=%s',
    aliases: ['baidu', 'bd', '百度'],
    keywords: ['search', '搜索'],
  },
  {
    id: 'wikipedia',
    label: 'Wikipedia',
    domain: 'wikipedia.org',
    url: 'https://www.wikipedia.org',
    searchUrlTemplate: 'https://www.wikipedia.org/w/index.php?search=%s',
    aliases: ['wiki', 'wikipedia', '维基'],
    keywords: ['百科', 'knowledge'],
  },
  // Content and social
  {
    id: 'youtube',
    label: 'YouTube',
    domain: 'youtube.com',
    url: 'https://www.youtube.com',
    searchUrlTemplate: 'https://www.youtube.com/results?search_query=%s',
    aliases: ['youtube', 'yt'],
    keywords: ['video', '影音'],
  },
  {
    id: 'bilibili',
    label: 'Bilibili',
    domain: 'bilibili.com',
    url: 'https://www.bilibili.com',
    searchUrlTemplate: 'https://search.bilibili.com/all?keyword=%s',
    aliases: ['bilibili', 'b站', 'bili'],
    keywords: ['video', '动漫', 'up主'],
  },
  {
    id: 'zhihu',
    label: 'Zhihu',
    domain: 'zhihu.com',
    url: 'https://www.zhihu.com',
    searchUrlTemplate: 'https://www.zhihu.com/search?type=content&q=%s',
    aliases: ['zhihu', '知乎', 'zh'],
    keywords: ['问答', '社区'],
  },
  {
    id: 'weibo',
    label: '微博',
    domain: 'weibo.com',
    url: 'https://weibo.com',
    searchUrlTemplate: 'https://s.weibo.com/weibo?q=%s',
    aliases: ['weibo', '微博', 'wb'],
    keywords: ['social', '社交'],
  },
  {
    id: 'xiaohongshu',
    label: '小红书',
    domain: 'xiaohongshu.com',
    url: 'https://www.xiaohongshu.com',
    searchUrlTemplate: 'https://www.xiaohongshu.com/search_result?keyword=%s',
    aliases: ['xiaohongshu', 'xhs', '小红书'],
    keywords: ['种草', '社区'],
  },
  {
    id: 'douyin',
    label: '抖音',
    domain: 'douyin.com',
    url: 'https://www.douyin.com',
    searchUrlTemplate: 'https://www.douyin.com/search/%s',
    aliases: ['douyin', 'dy', '抖音'],
    keywords: ['video', '短视频'],
  },
  {
    id: 'x',
    label: 'X',
    domain: 'x.com',
    url: 'https://x.com',
    searchUrlTemplate: 'https://x.com/search?q=%s',
    aliases: ['x', 'twitter', '推特'],
    keywords: ['social', 'news'],
  },
  {
    id: 'reddit',
    label: 'Reddit',
    domain: 'reddit.com',
    url: 'https://www.reddit.com',
    searchUrlTemplate: 'https://www.reddit.com/search/?q=%s',
    aliases: ['reddit', 'rdt'],
    keywords: ['forum', '社区'],
  },
  // Shopping
  {
    id: 'taobao',
    label: '淘宝',
    domain: 'taobao.com',
    url: 'https://www.taobao.com',
    searchUrlTemplate: 'https://s.taobao.com/search?q=%s',
    aliases: ['taobao', 'tb', '淘宝'],
    keywords: ['shop', '购物'],
  },
  {
    id: 'jd',
    label: '京东',
    domain: 'jd.com',
    url: 'https://www.jd.com',
    searchUrlTemplate: 'https://search.jd.com/Search?keyword=%s',
    aliases: ['jd', 'jingdong', '京东'],
    keywords: ['shop', '购物'],
  },
  {
    id: 'amazon',
    label: 'Amazon',
    domain: 'amazon.com',
    url: 'https://www.amazon.com',
    searchUrlTemplate: 'https://www.amazon.com/s?k=%s',
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

function buildSiteTokenIndex(sites: BuiltinSiteShortcut[]): Map<string, BuiltinSiteShortcut> {
  const index = new Map<string, BuiltinSiteShortcut>();
  sites.forEach((site) => {
    const tokens = [
      normalizeSiteToken(site.domain),
      normalizeSiteToken(site.id),
      ...site.aliases.map((alias) => normalizeSiteToken(alias)),
    ];
    tokens.forEach((token) => {
      if (token && !index.has(token)) {
        index.set(token, site);
      }
    });
  });
  return index;
}

const BUILTIN_SITE_TOKEN_INDEX = buildSiteTokenIndex(BUILTIN_SITE_SHORTCUTS);

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
  return BUILTIN_SITE_TOKEN_INDEX.get(token) || null;
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
  siteSearchUrl: string | null;
  siteLabel: string | null;
  historyQuery: string;
} {
  const trimmed = rawQuery.trim();
  if (!trimmed) return { query: '', siteDomain: null, siteSearchUrl: null, siteLabel: null, historyQuery: '' };

  const match = trimmed.match(/^(\S+)\s+(.+)$/);
  if (!match) {
    return { query: trimmed, siteDomain: null, siteSearchUrl: null, siteLabel: null, historyQuery: trimmed };
  }

  const token = match[1];
  const query = match[2].trim();
  if (!query) return { query: '', siteDomain: null, siteSearchUrl: null, siteLabel: null, historyQuery: '' };

  const site = findSiteByToken(token);
  if (!site) {
    return { query: trimmed, siteDomain: null, siteSearchUrl: null, siteLabel: null, historyQuery: trimmed };
  }

  return {
    query,
    siteDomain: site.domain,
    siteSearchUrl: site.searchUrlTemplate
      ? buildSiteDirectSearchUrl(site.searchUrlTemplate, query)
      : null,
    siteLabel: site.label,
    historyQuery: `${token} ${query}`,
  };
}

export function buildSiteDirectSearchUrl(searchUrlTemplate: string, query: string): string {
  const template = searchUrlTemplate.trim();
  const rawQuery = query.trim();
  if (!template || !rawQuery) return '';
  const encodedQuery = encodeURIComponent(rawQuery);
  if (template.includes('%s')) {
    return template.replace('%s', encodedQuery);
  }
  return `${template}${encodedQuery}`;
}

export function buildSiteSearchQuery(siteDomain: string, query: string): string {
  return `site:${siteDomain} ${query}`.trim();
}
