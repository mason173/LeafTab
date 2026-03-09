
export const extractDomainFromUrl = (url: string) => {
  try {
    const trimmedUrl = url.trim();
    const urlWithProtocol = trimmedUrl.includes('://') ? trimmedUrl : `https://${trimmedUrl}`;
    const urlObj = new URL(urlWithProtocol);
    return urlObj.hostname;
  } catch {
    return '';
  }
};

export const buildFaviconCandidates = (domain: string) => {
  const safeDomain = domain.trim();
  return [
    // Prefer CORS-friendly proxy/icon services first to improve caching success
    `https://icon.horse/icon/${safeDomain}`,
    `https://icons.duckduckgo.com/ip3/${safeDomain}.ico`,
    `https://www.google.com/s2/favicons?domain_url=${safeDomain}&sz=64`,
    `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${safeDomain}&size=64`,
    // Finally try site-hosted icons
    `https://${safeDomain}/favicon.ico`,
    `https://${safeDomain}/favicon.png`,
    `https://${safeDomain}/apple-touch-icon.png`,
    `https://${safeDomain}/apple-touch-icon-precomposed.png`,
    // Last-resort fallback (often returns 404 for migrated domains, e.g. chat.openai.com)
    `https://api.iowen.cn/favicon/${safeDomain}.png`,
  ];
};

export const isUrl = (str: string) => {
  // 包含空格通常不是网址
  if (/\s/.test(str)) return false;
  // 协议头开头
  if (/^https?:\/\//i.test(str)) return true;
  // localhost
  if (/^localhost([:\/].*)?$/i.test(str)) return true;
  // IP 地址
  if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(str)) return true;
  // 域名格式 (包含至少一个点，且最后一部分是2个以上字母)
  return /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/.test(str);
};

export const normalizeApiBase = (input: string) => {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  const withProtocol = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
  try {
    new URL(withProtocol);
  } catch {
    return '';
  }
  return withProtocol.replace(/\/+$/, '');
};
