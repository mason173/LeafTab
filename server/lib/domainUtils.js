const normalizeDomain = (domain) => {
  if (!domain || typeof domain !== 'string') return '';
  let d = domain.trim().toLowerCase();
  try {
    if (/^https?:\/\//i.test(d)) {
      const u = new URL(d);
      d = u.hostname;
    } else if (d.includes('/')) {
      const u = new URL(`http://${d}`);
      d = u.hostname;
    }
  } catch (_) {}
  if (d.startsWith('www.')) d = d.slice(4);
  if (!/^[a-z0-9.-]+$/.test(d)) return '';
  if (!d.includes('.')) return '';
  return d;
};

const registrableDomain = (domain) => {
  const d = normalizeDomain(domain);
  if (!d) return '';
  const parts = d.split('.');
  if (parts.length <= 2) return parts.join('.');
  const last2 = parts.slice(-2).join('.');
  const multiSuffixes = new Set([
    'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn',
    'co.uk', 'org.uk', 'ac.uk',
    'co.jp', 'or.jp', 'ne.jp', 'ac.jp', 'go.jp', 'gr.jp', 'ed.jp', 'ad.jp',
    'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
    'com.hk', 'com.tw',
  ]);
  if (multiSuffixes.has(last2)) {
    if (parts.length >= 3) return parts.slice(-3).join('.');
  }
  return last2;
};

module.exports = {
  normalizeDomain,
  registrableDomain,
};
