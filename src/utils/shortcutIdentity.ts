type ShortcutLike = {
  url?: unknown;
  id?: unknown;
};

const SCHEME_PREFIX_RE = /^[a-z][a-z0-9+.-]*:/i;
const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
const DEFAULT_PORTS: Record<string, string> = {
  'http:': '80',
  'https:': '443',
};

const normalizeHostname = (hostname: string) => {
  let next = hostname.trim().toLowerCase();
  if (!next) return '';
  if (next.endsWith('.')) next = next.slice(0, -1);
  if (next.startsWith('www.')) next = next.slice(4);
  return next;
};

const normalizePathname = (pathname: string) => {
  const compact = pathname.replace(/\/+$/g, '');
  return compact || '/';
};

const toUrl = (rawUrl: string): URL | null => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const withProtocol = SCHEME_PREFIX_RE.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol);
  } catch {
    return null;
  }
};

const fallbackIdentity = (rawUrl: string) => {
  let value = rawUrl.trim().toLowerCase();
  if (!value) return '';
  value = value.replace(URL_SCHEME_RE, '');
  value = value.replace(/^www\./, '');
  value = value.replace(/\/+$/g, '');
  return value;
};

export const getShortcutUrlIdentity = (rawUrl: string) => {
  const parsed = toUrl(rawUrl);
  if (!parsed) return fallbackIdentity(rawUrl);
  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname) return fallbackIdentity(rawUrl);
  const protocol = parsed.protocol.toLowerCase();
  const defaultPort = DEFAULT_PORTS[protocol];
  const port = parsed.port && parsed.port !== defaultPort ? `:${parsed.port}` : '';
  const pathname = normalizePathname(parsed.pathname || '/');
  const search = parsed.search || '';
  return `${hostname}${port}${pathname}${search}`;
};

export const getShortcutIdentityKey = (shortcut: ShortcutLike, index?: number) => {
  const url = typeof shortcut?.url === 'string' ? getShortcutUrlIdentity(shortcut.url) : '';
  const id = typeof shortcut?.id === 'string' ? shortcut.id : '';
  if (url) return `url:${url}`;
  if (id) return `id:${id}`;
  if (typeof index === 'number') return `idx:${index}`;
  return '';
};

export const hasShortcutUrlConflict = (
  shortcuts: ShortcutLike[],
  rawUrl: string,
  ignoreIndex?: number
) => {
  const target = getShortcutUrlIdentity(rawUrl);
  if (!target) return false;
  for (let i = 0; i < shortcuts.length; i += 1) {
    if (i === ignoreIndex) continue;
    const item = shortcuts[i];
    const key = typeof item?.url === 'string' ? getShortcutUrlIdentity(item.url) : '';
    if (key && key === target) return true;
  }
  return false;
};
