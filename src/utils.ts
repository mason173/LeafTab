
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

function isPrivateIpv4Host(hostname: string) {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;

  const octets = match.slice(1).map(Number);
  if (octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return false;
  }

  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export const shouldProbeRemoteFaviconForUrl = (url: string) => {
  try {
    const trimmedUrl = url.trim();
    const parsedUrl = new URL(trimmedUrl.includes('://') ? trimmedUrl : `https://${trimmedUrl}`);
    const protocol = parsedUrl.protocol.toLowerCase();
    const hostname = parsedUrl.hostname.trim().toLowerCase();

    if (protocol !== 'http:' && protocol !== 'https:') return false;
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.local')) return false;
    if (isPrivateIpv4Host(hostname)) return false;

    return true;
  } catch {
    return false;
  }
};

export const buildFaviconCandidates = (domain: string) => {
  const safeDomain = domain.trim();
  return [
    // Prefer site-hosted icons to avoid noisy third-party proxy failures in extension console
    `https://${safeDomain}/favicon.ico`,
    `https://${safeDomain}/favicon.png`,
    `https://${safeDomain}/apple-touch-icon.png`,
    `https://${safeDomain}/apple-touch-icon-precomposed.png`,
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
