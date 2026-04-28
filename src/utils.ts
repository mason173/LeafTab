
import { isLikelyLocalUrlHost, toNavigableUrl } from '@/utils/urlNavigation';

export const extractDomainFromUrl = (url: string) => {
  try {
    const trimmedUrl = url.trim();
    const urlWithProtocol = toNavigableUrl(trimmedUrl);
    const urlObj = new URL(urlWithProtocol);
    return urlObj.hostname;
  } catch {
    return '';
  }
};

const REMOTE_FAVICON_OVERRIDES: Record<string, string> = {
  'doubao.com': 'https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/favicon/64x64.png',
};

function normalizeFaviconCandidateDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/^www\./, '');
}

export function getRemoteFaviconOverride(domain: string) {
  return REMOTE_FAVICON_OVERRIDES[normalizeFaviconCandidateDomain(domain)] || '';
}

export const shouldProbeRemoteFaviconForUrl = (url: string) => {
  try {
    const trimmedUrl = url.trim();
    const parsedUrl = new URL(toNavigableUrl(trimmedUrl));
    const protocol = parsedUrl.protocol.toLowerCase();
    const hostname = parsedUrl.hostname.trim().toLowerCase();

    if (protocol !== 'http:' && protocol !== 'https:') return false;
    if (!hostname || isLikelyLocalUrlHost(hostname)) return false;

    return true;
  } catch {
    return false;
  }
};

export const buildFaviconCandidates = (domain: string) => {
  const safeDomain = domain.trim();
  const override = getRemoteFaviconOverride(safeDomain);
  const defaults = [
    // Prefer site-hosted icons to avoid noisy third-party proxy failures in extension console
    `https://${safeDomain}/favicon.ico`,
    `https://${safeDomain}/favicon.png`,
    `https://${safeDomain}/apple-touch-icon.png`,
    `https://${safeDomain}/apple-touch-icon-precomposed.png`,
  ];
  return override ? [override, ...defaults] : defaults;
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
