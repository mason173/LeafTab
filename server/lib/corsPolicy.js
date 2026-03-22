const LOCALHOST_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const EXTENSION_ORIGIN_RE = /^(chrome-extension|edge-extension|moz-extension):\/\/[^/]+$/i;

function parseAllowlist(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isExtensionOrigin(origin) {
  const value = String(origin || '').trim();
  if (!value) return false;
  return EXTENSION_ORIGIN_RE.test(value);
}

function isOriginAllowed(origin, options) {
  const {
    allowlist = [],
    allowExtensionOrigins = true,
    allowLocalhost = true,
  } = options || {};

  if (!origin) return true;
  if (allowLocalhost && LOCALHOST_ORIGIN_RE.test(origin)) return true;
  if (allowlist.length === 0) return true;
  if (allowlist.includes('*')) return true;
  if (allowlist.includes(origin)) return true;
  if (allowlist.some((entry) => entry.endsWith('*') && origin.startsWith(entry.slice(0, -1)))) return true;
  if (allowExtensionOrigins && isExtensionOrigin(origin)) return true;
  return false;
}

function createCorsOriginValidator(options) {
  return (origin, callback) => {
    if (isOriginAllowed(origin, options)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  };
}

module.exports = {
  parseAllowlist,
  createCorsOriginValidator,
  isOriginAllowed,
  isExtensionOrigin,
};
