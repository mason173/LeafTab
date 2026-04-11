import { useCallback, useEffect, useRef } from 'react';
import type { ScenarioShortcuts } from '../types';
import { extractDomainFromUrl } from '../utils';
import { resolveCustomIconFromCache, warmIconLibraryManifestCache } from '@/utils/iconLibrary';
import { flattenScenarioShortcutLinks } from '@/utils/shortcutFolders';

const DOMAIN_QUEUE_KEY = 'leaftab_domain_queue_v1';
const DOMAIN_LAST_FLUSH_AT_KEY = 'leaftab_domain_last_flush_at';
const DOMAIN_BACKOFF_UNTIL_KEY = 'leaftab_domain_backoff_until';
const DOMAIN_SEEDED_KEY = 'leaftab_domain_seeded_v1';

type UseShortcutDomainReportingParams = {
  user: string | null;
  API_URL: string;
  cloudSyncInitialized: boolean;
  scenarioShortcuts: ScenarioShortcuts;
};

export function useShortcutDomainReporting({
  user,
  API_URL,
  cloudSyncInitialized,
  scenarioShortcuts,
}: UseShortcutDomainReportingParams) {
  const domainFlushTimerRef = useRef<number | null>(null);
  const domainInFlightRef = useRef(false);
  const flushDomainQueueRef = useRef<() => void>(() => {});

  const normalizeDomain = useCallback((domain: string) => {
    if (!domain || typeof domain !== 'string') return '';
    let d = domain.trim().toLowerCase();
    if (d.startsWith('www.')) d = d.slice(4);
    if (!/^[a-z0-9.-]+$/.test(d)) return '';
    if (!d.includes('.')) return '';
    return d;
  }, []);

  const registrableDomain = useCallback((domain: string) => {
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
  }, [normalizeDomain]);

  const readDomainQueue = useCallback((): string[] => {
    try {
      const raw = localStorage.getItem(DOMAIN_QUEUE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((v) => typeof v === 'string');
    } catch {
      return [];
    }
  }, []);

  const writeDomainQueue = useCallback((list: string[]) => {
    try {
      localStorage.setItem(DOMAIN_QUEUE_KEY, JSON.stringify(list.slice(0, 500)));
    } catch {}
  }, []);

  const isPrivacyConsentEnabled = useCallback(() => {
    try {
      const raw = localStorage.getItem('privacy_consent');
      return raw ? JSON.parse(raw) === true : false;
    } catch {
      return false;
    }
  }, []);

  const scheduleFlushDomains = useCallback((delayMs: number) => {
    if (domainFlushTimerRef.current) {
      window.clearTimeout(domainFlushTimerRef.current);
      domainFlushTimerRef.current = null;
    }
    domainFlushTimerRef.current = window.setTimeout(() => {
      domainFlushTimerRef.current = null;
      flushDomainQueueRef.current();
    }, delayMs);
  }, []);

  const flushDomainQueue = useCallback(async (options?: { force?: boolean }) => {
    if (!user) return;
    if (!isPrivacyConsentEnabled()) {
      writeDomainQueue([]);
      return;
    }
    if (!navigator.onLine) return;
    if (domainInFlightRef.current) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const backoffUntilRaw = localStorage.getItem(DOMAIN_BACKOFF_UNTIL_KEY) || '';
    const backoffUntil = backoffUntilRaw ? Number(backoffUntilRaw) : 0;
    if (Number.isFinite(backoffUntil) && backoffUntil > Date.now()) return;

    await warmIconLibraryManifestCache();

    const filterUnsupportedDomains = (list: string[]) => {
      const seen = new Set<string>();
      const kept: string[] = [];
      for (const value of list) {
        if (typeof value !== 'string') continue;
        const apex = registrableDomain(value);
        if (!apex || seen.has(apex)) continue;
        seen.add(apex);
        if (resolveCustomIconFromCache(apex)?.url) continue;
        kept.push(apex);
      }
      return kept;
    };

    const queueRaw = readDomainQueue();
    const queue = filterUnsupportedDomains(queueRaw);
    if (queue.length !== queueRaw.length) {
      writeDomainQueue(queue);
    }
    if (queue.length === 0) return;

    const lastFlushRaw = localStorage.getItem(DOMAIN_LAST_FLUSH_AT_KEY) || '';
    const lastFlushAt = lastFlushRaw ? new Date(lastFlushRaw).getTime() : 0;
    const minIntervalMs = 5 * 60 * 1000;
    if (!options?.force && queue.length < 80 && lastFlushAt && Date.now() - lastFlushAt < minIntervalMs) {
      scheduleFlushDomains(minIntervalMs - (Date.now() - lastFlushAt));
      return;
    }

    const batch = queue.slice(0, 200);
    if (batch.length === 0) return;

    domainInFlightRef.current = true;
    try {
      const resp = await fetch(`${API_URL}/domains/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ domains: batch }),
      });
      if (resp.status === 401 || resp.status === 403) {
        try { localStorage.setItem(DOMAIN_BACKOFF_UNTIL_KEY, String(Date.now() + 10 * 60 * 1000)); } catch {}
        return;
      }
      if (!resp.ok) {
        try { localStorage.setItem(DOMAIN_BACKOFF_UNTIL_KEY, String(Date.now() + 2 * 60 * 1000)); } catch {}
        return;
      }
      const remaining = queue.slice(batch.length);
      writeDomainQueue(remaining);
      try { localStorage.setItem(DOMAIN_LAST_FLUSH_AT_KEY, new Date().toISOString()); } catch {}
      if (remaining.length > 0) {
        scheduleFlushDomains(15 * 1000);
      }
    } catch {
      try { localStorage.setItem(DOMAIN_BACKOFF_UNTIL_KEY, String(Date.now() + 2 * 60 * 1000)); } catch {}
    } finally {
      domainInFlightRef.current = false;
    }
  }, [API_URL, isPrivacyConsentEnabled, readDomainQueue, registrableDomain, scheduleFlushDomains, user, writeDomainQueue]);

  useEffect(() => {
    flushDomainQueueRef.current = () => {
      flushDomainQueue();
    };
  }, [flushDomainQueue]);

  useEffect(() => {
    const onForceFlush = () => {
      flushDomainQueue({ force: true });
    };
    window.addEventListener('leaftab-domains-flush-now', onForceFlush);
    return () => {
      window.removeEventListener('leaftab-domains-flush-now', onForceFlush);
    };
  }, [flushDomainQueue]);

  useEffect(() => {
    return () => {
      if (domainFlushTimerRef.current) {
        window.clearTimeout(domainFlushTimerRef.current);
        domainFlushTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!isPrivacyConsentEnabled()) return;
    if (!cloudSyncInitialized) return;
    let cancelled = false;
    (async () => {
      const seededRaw = localStorage.getItem(DOMAIN_SEEDED_KEY) || '';
      if (seededRaw === user) return;

      // Best effort: warm icon manifest cache before seeding, to avoid reporting already-supported domains.
      await warmIconLibraryManifestCache();
      if (cancelled) return;

      const queue = readDomainQueue();
      const set = new Set(
        queue.filter((d) => d && !resolveCustomIconFromCache(d)?.url).map((d) => registrableDomain(d)).filter(Boolean)
      );
      for (const item of flattenScenarioShortcutLinks(scenarioShortcuts)) {
        const url = item?.url || '';
        if (!url) continue;
        const host = extractDomainFromUrl(url);
        const apex = registrableDomain(host);
        if (!apex) continue;
        if (resolveCustomIconFromCache(apex)?.url) continue;
        set.add(apex);
        if (set.size >= 500) break;
      }
      if (cancelled) return;
      writeDomainQueue(Array.from(set));
      try { localStorage.setItem(DOMAIN_SEEDED_KEY, user); } catch {}
      scheduleFlushDomains(10 * 1000);
    })();
    return () => {
      cancelled = true;
    };
  }, [cloudSyncInitialized, isPrivacyConsentEnabled, readDomainQueue, registrableDomain, scheduleFlushDomains, scenarioShortcuts, user, writeDomainQueue]);

  useEffect(() => {
    if (!user) return;
    if (!isPrivacyConsentEnabled()) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushDomainQueue();
    };
    const onOnline = () => flushDomainQueue();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
  }, [flushDomainQueue, isPrivacyConsentEnabled, user]);

  const reportDomain = useCallback((url: string) => {
    if (!user) return;
    if (!isPrivacyConsentEnabled()) return;
    const host = extractDomainFromUrl(url);
    const apex = registrableDomain(host);
    if (!apex) return;
    if (resolveCustomIconFromCache(apex)?.url) return;
    const queue = readDomainQueue();
    if (!queue.includes(apex)) {
      queue.push(apex);
      writeDomainQueue(queue);
    }
    if (queue.length >= 30) {
      scheduleFlushDomains(3 * 1000);
      return;
    }
    scheduleFlushDomains(30 * 1000);
  }, [isPrivacyConsentEnabled, readDomainQueue, registrableDomain, scheduleFlushDomains, user, writeDomainQueue]);

  return {
    reportDomain,
  };
}
