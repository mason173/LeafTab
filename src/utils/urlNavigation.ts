const SCHEME_PREFIX_RE = /^[a-z][a-z0-9+.-]*:/i;
const IPV4_HOST_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const HOST_PORT_WITHOUT_SCHEME_RE = /^(localhost|[a-z0-9.-]+):\d+(?:[/?#].*)?$/i;

function normalizeHostname(hostname: string) {
  let normalized = hostname.trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    normalized = normalized.slice(1, -1);
  }
  if (normalized.endsWith('.')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function isPrivateIpv4Host(hostname: string) {
  const match = normalizeHostname(hostname).match(IPV4_HOST_RE);
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

function isLocalIpv6Host(hostname: string) {
  const normalized = normalizeHostname(hostname);
  if (!normalized.includes(':')) return false;
  if (normalized === '::1') return true;
  if (normalized.startsWith('fe80:')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  return false;
}

export function hasExplicitUrlScheme(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!SCHEME_PREFIX_RE.test(trimmed)) return false;
  if (HOST_PORT_WITHOUT_SCHEME_RE.test(trimmed)) return false;
  return true;
}

export function isLikelyLocalUrlHost(hostname: string) {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;
  if (normalized === 'localhost' || normalized.endsWith('.local')) return true;
  if (isPrivateIpv4Host(normalized)) return true;
  if (isLocalIpv6Host(normalized)) return true;
  return false;
}

function readHostnameFromUserInput(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return '';

  try {
    return new URL(`http://${trimmed}`).hostname;
  } catch {
    return '';
  }
}

export function toNavigableUrl(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed || hasExplicitUrlScheme(trimmed)) {
    return trimmed;
  }

  const hostname = readHostnameFromUserInput(trimmed);
  const scheme = isLikelyLocalUrlHost(hostname) ? 'http://' : 'https://';
  return `${scheme}${trimmed}`;
}
