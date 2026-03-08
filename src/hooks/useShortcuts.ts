import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from '../components/ui/sonner';
import { useTranslation } from 'react-i18next';
import { ScenarioShortcuts, Shortcut, CloudShortcutsPayloadV3, ScenarioMode, ContextMenuState } from '../types';
import { defaultScenarioModes, makeScenarioId, SCENARIO_MODES_KEY, SCENARIO_SELECTED_KEY, ScenarioIconKey } from "@/scenario/scenario";
import defaultProfile from '../assets/profiles/default-profile.json';
import { isUrl, extractDomainFromUrl } from '../utils';
import { buildBackupDataV4, clampShortcutsRowsPerColumn } from '@/utils/backupData';

const LOCAL_SHORTCUTS_KEY = 'local_shortcuts_v3';
const LEGACY_SHORTCUTS_KEY = 'local_shortcuts';
const DOMAIN_QUEUE_KEY = 'leaftab_domain_queue_v1';
const DOMAIN_LAST_FLUSH_AT_KEY = 'leaftab_domain_last_flush_at';
const DOMAIN_BACKOFF_UNTIL_KEY = 'leaftab_domain_backoff_until';
const DOMAIN_SEEDED_KEY = 'leaftab_domain_seeded_v1';
const ROLE_PROFILE_FILES: Record<string, string> = {
  general: 'leaftab_backup_general.leaftab',
  programmer: 'leaftab_backup_Programmer.leaftab',
  product_manager: 'leaftab_backup_product_manager.leaftab',
  designer: 'leaftab_backup_designer.leaftab',
  student: 'leaftab_backup_student.leaftab',
  marketer: 'leaftab_backup_marketer.leaftab',
  finance: 'leaftab_backup_finance.leaftab',
  hr: 'leaftab_backup_hr.leaftab',
  admin: 'leaftab_backup_admin.leaftab',
};

export function useShortcuts(
  user: string | null,
  openInNewTab: boolean,
  API_URL: string,
  handleLogout: (input?: string | { message?: string; clearLocal?: boolean }) => void,
  shortcutsRowsPerColumn: number
) {
  const { t, i18n } = useTranslation();

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

    const queue = readDomainQueue();
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
  }, [API_URL, isPrivacyConsentEnabled, readDomainQueue, scheduleFlushDomains, user, writeDomainQueue]);

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

  const reportDomain = useCallback((url: string) => {
    if (!user) return;
    if (!isPrivacyConsentEnabled()) return;
    const host = extractDomainFromUrl(url);
    const apex = registrableDomain(host);
    if (!apex) return;
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
  }, [extractDomainFromUrl, isPrivacyConsentEnabled, readDomainQueue, registrableDomain, scheduleFlushDomains, user, writeDomainQueue]);

  const normalizeScenarioModesList = useCallback((raw: unknown) => {
    if (!Array.isArray(raw)) return defaultScenarioModes;
    const normalized = raw
      .filter((v): v is ScenarioMode => Boolean(v) && typeof v === 'object')
      .map((v: any) => ({
        id: typeof v.id === 'string' ? v.id : makeScenarioId(),
        name: typeof v.name === 'string' ? v.name.slice(0, 12) : t('scenario.unnamed'),
        color: typeof v.color === 'string' ? v.color : defaultScenarioModes[0].color,
        icon: (typeof v.icon === 'string' ? v.icon : defaultScenarioModes[0].icon) as ScenarioIconKey,
      }))
      .filter((v) => v.id && v.name && v.color && v.icon);

    return normalized.length ? normalized : defaultScenarioModes;
  }, [t]);

  const normalizeScenarioShortcuts = useCallback((raw: unknown) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const obj = raw as Record<string, unknown>;
    const next: ScenarioShortcuts = {};
    Object.entries(obj).forEach(([scenarioId, value]) => {
      if (Array.isArray(value)) next[scenarioId] = value as Shortcut[];
      else if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) {
        next[scenarioId] = [];
      }
    });
    return next;
  }, []);

  const [scenarioModes, setScenarioModes] = useState<ScenarioMode[]>(() => {
    try {
      const raw = localStorage.getItem(SCENARIO_MODES_KEY);
      if (!raw) return defaultScenarioModes;
      const parsed: unknown = JSON.parse(raw);
      return normalizeScenarioModesList(parsed);
    } catch {
      return defaultScenarioModes;
    }
  });

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(() => {
    const cached = localStorage.getItem(SCENARIO_SELECTED_KEY);
    return cached || defaultScenarioModes[0].id;
  });

  const [scenarioShortcuts, setScenarioShortcuts] = useState<ScenarioShortcuts>(() => {
    const initial = normalizeScenarioShortcuts(defaultProfile?.data?.scenarioShortcuts);
    if (Object.keys(initial).length) return initial;
    return { [defaultScenarioModes[0].id]: [] };
  });

  const [cloudSyncInitialized, setCloudSyncInitialized] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const lastSavedShortcutsJson = useRef<string>('');
  const lastFetchUserRef = useRef<string | null>(null);
  const localDirtyRef = useRef(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [pendingLocalPayload, setPendingLocalPayload] = useState<CloudShortcutsPayloadV3 | null>(null);
  const [pendingCloudPayload, setPendingCloudPayload] = useState<CloudShortcutsPayloadV3 | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [shortcutEditOpen, setShortcutEditOpen] = useState(false);
  const [shortcutModalMode, setShortcutModalMode] = useState<'add' | 'edit'>('add');
  const [shortcutDeleteOpen, setShortcutDeleteOpen] = useState(false);
  const [scenarioModeOpen, setScenarioModeOpen] = useState(false);
  const [scenarioCreateOpen, setScenarioCreateOpen] = useState(false);
  const [scenarioEditOpen, setScenarioEditOpen] = useState(false);
  const [selectedShortcut, setSelectedShortcut] = useState<{ index: number; shortcut: Shortcut } | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingUrl, setEditingUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [currentEditScenarioId, setCurrentEditScenarioId] = useState<string>('');
  const [currentInsertIndex, setCurrentInsertIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!isPrivacyConsentEnabled()) return;
    if (!cloudSyncInitialized) return;
    const seededRaw = localStorage.getItem(DOMAIN_SEEDED_KEY) || '';
    if (seededRaw === user) return;
    const queue = readDomainQueue();
    const set = new Set(queue);
    Object.values(scenarioShortcuts).forEach((list) => {
      if (!Array.isArray(list)) return;
      for (const item of list) {
        const url = item && typeof (item as any).url === 'string' ? (item as any).url : '';
        if (!url) continue;
        const host = extractDomainFromUrl(url);
        const apex = registrableDomain(host);
        if (!apex) continue;
        set.add(apex);
        if (set.size >= 500) break;
      }
    });
    writeDomainQueue(Array.from(set));
    try { localStorage.setItem(DOMAIN_SEEDED_KEY, user); } catch {}
    scheduleFlushDomains(10 * 1000);
  }, [cloudSyncInitialized, extractDomainFromUrl, isPrivacyConsentEnabled, readDomainQueue, registrableDomain, scheduleFlushDomains, scenarioShortcuts, user, writeDomainQueue]);

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

  const shortcuts = scenarioShortcuts[selectedScenarioId] ?? [];
  const maxShortcutsPerColumn = useMemo(() => clampShortcutsRowsPerColumn(shortcutsRowsPerColumn), [shortcutsRowsPerColumn]);
  const shortcutsPageCapacity = maxShortcutsPerColumn * 3;

  const totalShortcuts = useMemo(() => {
    let count = 0;
    Object.values(scenarioShortcuts).forEach((list) => {
      if (Array.isArray(list)) count += list.length;
    });
    return count;
  }, [scenarioShortcuts]);

  const getMaxPageIndex = useCallback((length: number) => {
    if (length <= 0) return 0;
    return Math.max(0, Math.ceil(length / shortcutsPageCapacity) - 1);
  }, [shortcutsPageCapacity]);

  const updateScenarioShortcuts = useCallback((updater: (prev: Shortcut[]) => Shortcut[]) => {
    setScenarioShortcuts((prev) => {
      const current = prev[selectedScenarioId] ?? [];
      const nextCurrent = updater(current);
      if (!user) localDirtyRef.current = true;
      return { ...prev, [selectedScenarioId]: nextCurrent };
    });
  }, [selectedScenarioId, user]);

  const findInsertIndex = useCallback((startPageIndex: number) => {
    const current = scenarioShortcuts[selectedScenarioId] ?? [];
    const maxPage = getMaxPageIndex(current.length);
    for (let page = startPageIndex; page <= maxPage; page += 1) {
      const start = page * shortcutsPageCapacity;
      const end = Math.min(start + shortcutsPageCapacity, current.length);
      if (end - start < shortcutsPageCapacity) {
        return { targetIndex: end, targetPage: page };
      }
    }
    const targetPage = maxPage + 1;
    return { targetIndex: current.length, targetPage };
  }, [scenarioShortcuts, selectedScenarioId, getMaxPageIndex, shortcutsPageCapacity]);

  const loadLocalScenarioShortcuts = useCallback(() => {
    const raw = localStorage.getItem(LOCAL_SHORTCUTS_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeScenarioShortcuts(parsed);
      return Object.keys(normalized).length ? normalized : null;
    } catch {
      return null;
    }
  }, [normalizeScenarioShortcuts]);

  const buildCloudShortcutsPayload = useCallback(({
    nextScenarioModes,
    nextSelectedScenarioId,
    nextScenarioShortcuts,
  }: {
    nextScenarioModes?: ScenarioMode[];
    nextSelectedScenarioId?: string;
    nextScenarioShortcuts?: ScenarioShortcuts;
  } = {}): CloudShortcutsPayloadV3 => {
    const modes = nextScenarioModes ?? scenarioModes;
    const selectedId = nextSelectedScenarioId ?? selectedScenarioId;
    const shortcutsValue = nextScenarioShortcuts ?? scenarioShortcuts;
    const finalSelectedId = modes.some((m) => m.id === selectedId) ? selectedId : modes[0]?.id ?? defaultScenarioModes[0].id;
    return {
      version: 3,
      scenarioModes: modes,
      selectedScenarioId: finalSelectedId,
      scenarioShortcuts: shortcutsValue,
    };
  }, [scenarioModes, selectedScenarioId, scenarioShortcuts]);

  const normalizeCloudShortcutsPayload = useCallback((raw: unknown) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const obj = raw as Record<string, unknown>;
    const candidate = (obj.type === 'leaftab_backup' && obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data))
      ? ({ version: 3, ...(obj.data as any) } as Record<string, unknown>)
      : obj;
    if (candidate.version !== 3) return null;
    const modes = normalizeScenarioModesList(candidate.scenarioModes);
    const shortcutsValue = normalizeScenarioShortcuts(candidate.scenarioShortcuts);
    const selectedIdCandidate = typeof candidate.selectedScenarioId === 'string' ? candidate.selectedScenarioId : modes[0]?.id ?? defaultScenarioModes[0].id;
    const finalSelectedId = modes.some((m) => m.id === selectedIdCandidate) ? selectedIdCandidate : modes[0]?.id ?? defaultScenarioModes[0].id;
    return {
      version: 3,
      scenarioModes: modes,
      selectedScenarioId: finalSelectedId,
      scenarioShortcuts: shortcutsValue,
    } satisfies CloudShortcutsPayloadV3;
  }, [normalizeScenarioModesList, normalizeScenarioShortcuts]);

  useEffect(() => {
    localStorage.setItem(SCENARIO_MODES_KEY, JSON.stringify(scenarioModes));
  }, [scenarioModes]);

  useEffect(() => {
    localStorage.setItem(SCENARIO_SELECTED_KEY, selectedScenarioId);
  }, [selectedScenarioId]);

  useEffect(() => {
    try { localStorage.removeItem(LEGACY_SHORTCUTS_KEY); } catch {}
  }, []);

  const hasLoadedLocalShortcutsRef = useRef(false);
  useEffect(() => {
    if (user) {
      hasLoadedLocalShortcutsRef.current = false;
      return;
    }
    if (hasLoadedLocalShortcutsRef.current) return;
    const localScenarioShortcuts = loadLocalScenarioShortcuts();
    if (localScenarioShortcuts) {
      setScenarioShortcuts(localScenarioShortcuts);
    }
    hasLoadedLocalShortcutsRef.current = true;
  }, [user, loadLocalScenarioShortcuts]);

  useEffect(() => {
    setScenarioShortcuts((prev) => {
      if (prev[selectedScenarioId]) return prev;
      return { ...prev, [selectedScenarioId]: [] };
    });
  }, [selectedScenarioId]);

  const applyRoleProfileData = useCallback((profileData: any, roleId?: string | null) => {
    const normalizedModes = normalizeScenarioModesList(profileData?.scenarioModes);
    const nextSelectedId = typeof profileData?.selectedScenarioId === 'string'
      ? profileData.selectedScenarioId
      : normalizedModes[0]?.id;
    const nextShortcuts = normalizeScenarioShortcuts(profileData?.scenarioShortcuts);
    setScenarioModes(normalizedModes);
    if (nextSelectedId) setSelectedScenarioId(nextSelectedId);
    setScenarioShortcuts(nextShortcuts);
    localStorage.setItem(SCENARIO_MODES_KEY, JSON.stringify(normalizedModes));
    if (nextSelectedId) localStorage.setItem(SCENARIO_SELECTED_KEY, nextSelectedId);
    localStorage.setItem(LOCAL_SHORTCUTS_KEY, JSON.stringify(nextShortcuts));
    localStorage.setItem('local_shortcuts_updated_at', new Date().toISOString());
    localStorage.removeItem('leaf_tab_shortcuts_cache');
    localStorage.removeItem('leaf_tab_sync_pending');
    localStorage.removeItem('cloud_shortcuts_fetched_at');
    localDirtyRef.current = true;
    if (roleId) setUserRole(roleId);
  }, [normalizeScenarioModesList, normalizeScenarioShortcuts, setScenarioModes, setSelectedScenarioId, setScenarioShortcuts, localDirtyRef, setUserRole]);

  const resetLocalShortcutsByRole = useCallback(async (roleId?: string | null) => {
    const role = roleId || localStorage.getItem('role');
    let profileData = defaultProfile?.data;
    const storedRoleFile = localStorage.getItem('role_profile_file');
    const normalizedRole = role ? role.toLowerCase() : '';
    const roleFile = storedRoleFile || ROLE_PROFILE_FILES[normalizedRole];
    if (roleFile) {
      try {
        const localizedFile = storedRoleFile
          ? roleFile
          : (i18n.language !== 'zh' && i18n.language !== 'zh-CN'
            ? roleFile.replace('.leaftab', '_en.leaftab')
            : roleFile);
        const response = await fetch(`./profiles/${localizedFile}`);
        const data = await response.json();
        if (data && data.type === 'leaftab_backup' && data.data) {
          profileData = data.data;
        }
      } catch {}
    }
    applyRoleProfileData(profileData, role || undefined);
  }, [applyRoleProfileData, i18n.language]);

  const fetchShortcuts = useCallback(async () => {
    if (!user) return;
    
    const isSyncPending = localStorage.getItem('leaf_tab_sync_pending') === 'true';
    if (isSyncPending) {
       try {
         const cached = localStorage.getItem('leaf_tab_shortcuts_cache');
         if (cached) {
           const payload = normalizeCloudShortcutsPayload(JSON.parse(cached));
           if (payload) {
             setScenarioModes(payload.scenarioModes);
             setSelectedScenarioId(payload.selectedScenarioId);
             setScenarioShortcuts(payload.scenarioShortcuts);
             setCloudSyncInitialized(true);
             return;
           }
         }
       } catch {}
    }

    try {
      if (!navigator.onLine) throw new Error('Offline detected');
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/user/shortcuts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.createdAt) localStorage.setItem('user_created_at', data.createdAt);
        if (data.role) {
          setUserRole(data.role);
          localStorage.setItem('role', data.role);
        }

        const localScenarioShortcuts = loadLocalScenarioShortcuts();
        const localPayload = localScenarioShortcuts ? buildCloudShortcutsPayload({ nextScenarioShortcuts: localScenarioShortcuts }) : null;
        let cloudPayload: CloudShortcutsPayloadV3 | null = null;

        if (data.shortcuts) {
          try {
            cloudPayload = normalizeCloudShortcutsPayload(JSON.parse(data.shortcuts));
          } catch {
            cloudPayload = null;
          }
        }

        const localJson = localPayload ? JSON.stringify(localPayload) : '';
        const cloudJson = cloudPayload ? JSON.stringify(cloudPayload) : '';

        if (localPayload && cloudPayload && localJson !== cloudJson) {
          setPendingLocalPayload(localPayload);
          setPendingCloudPayload(cloudPayload);
          setConflictModalOpen(true);
          return;
        }

        if (localPayload && !cloudPayload) {
           setScenarioShortcuts(localPayload.scenarioShortcuts);
           setScenarioModes(localPayload.scenarioModes);
           setSelectedScenarioId(localPayload.selectedScenarioId);
           setCloudSyncInitialized(true);
           try { localStorage.setItem('local_shortcuts_updated_at', new Date().toISOString()); } catch {}
           const localRole = localStorage.getItem('role');
           if (localRole) {
             setUserRole(localRole);
             fetch(`${API_URL}/user/role`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
               body: JSON.stringify({ role: localRole })
             }).catch(console.error);
           }
           setTimeout(() => {
             lastSavedShortcutsJson.current = '';
           }, 100);
           return;
        }

        if (cloudPayload) {
          lastSavedShortcutsJson.current = cloudJson;
          setScenarioModes(cloudPayload.scenarioModes);
          setSelectedScenarioId(cloudPayload.selectedScenarioId);
          setScenarioShortcuts(cloudPayload.scenarioShortcuts);
          localStorage.removeItem(LOCAL_SHORTCUTS_KEY);
          localStorage.setItem('leaf_tab_shortcuts_cache', cloudJson);
          try { localStorage.setItem('cloud_shortcuts_fetched_at', new Date().toISOString()); } catch {}
          toast.success(t('toast.cloudSynced'));
        }
      } else if (response.status === 401 || response.status === 403) {
         const contentType = response.headers.get("content-type");
         if (contentType && contentType.includes("application/json")) {
            handleLogout(t('toast.sessionExpired'));
            return;
         }
       }
      setCloudSyncInitialized(true);
    } catch (error) {
      console.error('Failed to fetch shortcuts:', error);
      try {
         const cached = localStorage.getItem('leaf_tab_shortcuts_cache');
         if (cached) {
           const payload = normalizeCloudShortcutsPayload(JSON.parse(cached));
           if (payload) {
              setScenarioModes(payload.scenarioModes);
              setSelectedScenarioId(payload.selectedScenarioId);
              setScenarioShortcuts(payload.scenarioShortcuts);
              toast.success(t('toast.loadedFromCache'));
              setCloudSyncInitialized(true);
              lastSavedShortcutsJson.current = JSON.stringify(payload);
              try { localStorage.setItem('cloud_shortcuts_fetched_at', new Date().toISOString()); } catch {}
              return;
           }
         }
       } catch {}
      toast.error(t('toast.cloudSyncFailed'));
    }
  }, [user, API_URL, normalizeCloudShortcutsPayload, buildCloudShortcutsPayload, loadLocalScenarioShortcuts, t, handleLogout]);

  useEffect(() => {
    if (!user) {
      lastFetchUserRef.current = null;
      return;
    }
    if (lastFetchUserRef.current === user) return;
    lastFetchUserRef.current = user;
    fetchShortcuts();
  }, [user, fetchShortcuts]);

  useEffect(() => {
    if (!user) return;
    if (conflictModalOpen || isDragging || !cloudSyncInitialized) return;

    const payload = buildCloudShortcutsPayload();
    const currentJson = JSON.stringify(payload);
    if (currentJson === lastSavedShortcutsJson.current) return;

    const saveShortcuts = async () => {
      if (!navigator.onLine) {
        localStorage.setItem('leaf_tab_sync_pending', 'true');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const envelope = buildBackupDataV4({
          scenarioModes: payload.scenarioModes,
          selectedScenarioId: payload.selectedScenarioId,
          scenarioShortcuts: payload.scenarioShortcuts,
        });
        const response = await fetch(`${API_URL}/user/shortcuts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ shortcuts: envelope })
        });

        if (response.ok) {
          lastSavedShortcutsJson.current = currentJson;
          localStorage.removeItem('leaf_tab_sync_pending');
        } else if (response.status === 401 || response.status === 403) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            handleLogout(t('toast.sessionExpired'));
          } else {
            localStorage.setItem('leaf_tab_sync_pending', 'true');
          }
        } else {
          localStorage.setItem('leaf_tab_sync_pending', 'true');
        }
      } catch (error) {
        localStorage.setItem('leaf_tab_sync_pending', 'true');
      }
    };

    const timer = setTimeout(saveShortcuts, 1000);
    return () => clearTimeout(timer);
  }, [scenarioShortcuts, scenarioModes, selectedScenarioId, user, conflictModalOpen, isDragging, cloudSyncInitialized, API_URL, buildCloudShortcutsPayload, t, handleLogout]);

  useEffect(() => {
    if (user) {
      try {
        const payload = buildCloudShortcutsPayload();
        localStorage.setItem('leaf_tab_shortcuts_cache', JSON.stringify(payload));
        localStorage.setItem('cloud_shortcuts_fetched_at', new Date().toISOString());
      } catch {}
      return;
    }
    if (!localDirtyRef.current) return;
    try {
      localStorage.setItem(LOCAL_SHORTCUTS_KEY, JSON.stringify(scenarioShortcuts));
      localStorage.setItem('local_shortcuts_updated_at', new Date().toISOString());
    } catch {}
  }, [scenarioShortcuts, user, scenarioModes, selectedScenarioId, buildCloudShortcutsPayload]);

  const resolveWithCloud = useCallback(() => {
    if (!pendingCloudPayload) {
      setConflictModalOpen(false);
      return;
    }
    const cloudJson = JSON.stringify(pendingCloudPayload);
    lastSavedShortcutsJson.current = cloudJson;
    setScenarioModes(pendingCloudPayload.scenarioModes);
    setSelectedScenarioId(pendingCloudPayload.selectedScenarioId);
    setScenarioShortcuts(pendingCloudPayload.scenarioShortcuts);
    localStorage.removeItem(LOCAL_SHORTCUTS_KEY);
    localStorage.removeItem('leaf_tab_sync_pending');
    localStorage.setItem('leaf_tab_shortcuts_cache', cloudJson);
    localDirtyRef.current = false;
    setCloudSyncInitialized(true);
    setConflictModalOpen(false);
    setPendingLocalPayload(null);
    setPendingCloudPayload(null);
    toast.success(t('toast.syncCloudApplied'));
  }, [pendingCloudPayload, t]);

  const resolveWithLocal = useCallback(() => {
    if (!pendingLocalPayload) {
      setConflictModalOpen(false);
      return;
    }
    const cloudJson = pendingCloudPayload ? JSON.stringify(pendingCloudPayload) : '';
    lastSavedShortcutsJson.current = cloudJson;
    setScenarioModes(pendingLocalPayload.scenarioModes);
    setSelectedScenarioId(pendingLocalPayload.selectedScenarioId);
    setScenarioShortcuts(pendingLocalPayload.scenarioShortcuts);
    localStorage.removeItem(LOCAL_SHORTCUTS_KEY);
    localStorage.removeItem('leaf_tab_sync_pending');
    localStorage.setItem('leaf_tab_shortcuts_cache', JSON.stringify(pendingLocalPayload));
    localDirtyRef.current = false;
    setCloudSyncInitialized(true);
    setConflictModalOpen(false);
    setPendingLocalPayload(null);
    setPendingCloudPayload(null);
    toast.success(t('toast.syncLocalApplied'));
  }, [pendingLocalPayload, pendingCloudPayload, t]);

  const handleCreateScenarioMode = useCallback((mode: Omit<ScenarioMode, 'id'>) => {
    const newMode: ScenarioMode = { id: makeScenarioId(), ...mode };
    setScenarioModes((prev) => [...prev, newMode]);
    setScenarioShortcuts((prev) => ({ ...prev, [newMode.id]: [] }));
    if (!user) localDirtyRef.current = true;
    setSelectedScenarioId(newMode.id);
    toast.success(t('scenario.toast.created'));
  }, [user]);

  const handleOpenEditScenarioMode = useCallback((id: string) => {
    setCurrentEditScenarioId(id);
    setScenarioEditOpen(true);
  }, []);

  const handleUpdateScenarioMode = useCallback((mode: Omit<ScenarioMode, 'id'>) => {
    const id = currentEditScenarioId;
    if (!id) return;
    setScenarioModes((prev) => prev.map((m) => (m.id === id ? { ...m, ...mode } : m)));
    toast.success(t('scenario.toast.updated'));
  }, [currentEditScenarioId]);

  const handleDeleteScenarioMode = useCallback((id: string) => {
    if (id === 'default') return;
    setScenarioModes((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((m) => m.id !== id);
      const fallbackId = next[0]?.id ?? defaultScenarioModes[0].id;
      setSelectedScenarioId((curr) => (curr === id ? fallbackId : curr));
      return next;
    });
    setScenarioShortcuts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (!user) localDirtyRef.current = true;
    toast.success(t('scenario.toast.deleted'));
  }, [user]);

  const handleShortcutOpen = useCallback((shortcut: Shortcut) => {
    let url = shortcut.url.trim();
    if (/^javascript:/i.test(url)) return;
    if (!url.includes('://')) url = `https://${url}`;
    if (openInNewTab) window.open(url, '_blank');
    else window.location.href = url;
  }, [openInNewTab]);

  const handleShortcutContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>, shortcutIndex: number, shortcut: Shortcut) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 160;
    const menuHeight = 260;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
    setContextMenu({ x, y, kind: 'shortcut', shortcutIndex, shortcut });
  }, []);

  const handlePageContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const menuWidth = 160;
    const menuHeight = 52;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
    setContextMenu({ x, y, kind: 'page' });
  }, []);

  const handlePageReorder = useCallback((pageIndex: number, nextShortcuts: Shortcut[]) => {
    updateScenarioShortcuts((current) => {
      const start = pageIndex * shortcutsPageCapacity;
      const end = Math.min(start + shortcutsPageCapacity, current.length);
      return [...current.slice(0, start), ...nextShortcuts, ...current.slice(end)];
    });
  }, [updateScenarioShortcuts, shortcutsPageCapacity]);

  const moveShortcutToPage = useCallback((sourceIndex: number, targetPageInput: number, options?: { strict?: boolean }) => {
    updateScenarioShortcuts((current) => {
      if (sourceIndex < 0 || sourceIndex >= current.length) return current;
      const maxPage = getMaxPageIndex(current.length);
      const targetPage = Math.max(0, targetPageInput);
      if (options?.strict && targetPage > maxPage) return current;
      const moving = current[sourceIndex];
      const rest = current.filter((_, index) => index !== sourceIndex);
      const insertIndex = Math.min(rest.length, targetPage * shortcutsPageCapacity);
      return [...rest.slice(0, insertIndex), moving, ...rest.slice(insertIndex)];
    });
  }, [updateScenarioShortcuts, getMaxPageIndex, shortcutsPageCapacity]);

  const handleSaveShortcutEdit = useCallback((title: string, url: string) => {
    if (!title || !url) {
      toast.error(t('shortcutModal.errors.fillAll'), { description: t('shortcutModal.errors.fillAllDesc') });
      return;
    }

    reportDomain(url);

    if (shortcutModalMode === 'add') {
      if (currentInsertIndex === null) return;
      const newShortcut: Shortcut = { id: Date.now().toString(), title, url, icon: '' };
      updateScenarioShortcuts((current) => {
        const insertIndex = Math.min(Math.max(currentInsertIndex, 0), current.length);
        return [...current.slice(0, insertIndex), newShortcut, ...current.slice(insertIndex)];
      });
    } else {
      if (!selectedShortcut) return;
      let newIcon = selectedShortcut.shortcut.icon;
      if (url !== selectedShortcut.shortcut.url && newIcon.includes('api.iowen.cn')) newIcon = '';
      updateScenarioShortcuts((current) => current.map((item, index) => (
        index === selectedShortcut.index ? { ...item, title, url, icon: newIcon } : item
      )));
    }
    setShortcutEditOpen(false);
    setSelectedShortcut(null);
    setCurrentInsertIndex(null);
  }, [shortcutModalMode, currentInsertIndex, updateScenarioShortcuts, selectedShortcut, t, reportDomain]);

  const handleConfirmDeleteShortcut = useCallback(() => {
    if (!selectedShortcut) return;
    updateScenarioShortcuts((current) => current.filter((_, index) => index !== selectedShortcut.index));
    setShortcutDeleteOpen(false);
    setSelectedShortcut(null);
  }, [selectedShortcut, updateScenarioShortcuts]);

  const findOrCreateAvailableIndex = useCallback((startPageIndex: number) => {
    const result = findInsertIndex(startPageIndex);
    return result;
  }, [findInsertIndex]);

  const handleDeletePage = useCallback((pageIndex: number) => {
    updateScenarioShortcuts((current) => {
      const start = pageIndex * shortcutsPageCapacity;
      const end = Math.min(start + shortcutsPageCapacity, current.length);
      return [...current.slice(0, start), ...current.slice(end)];
    });
  }, [updateScenarioShortcuts, shortcutsPageCapacity]);

  return {
    scenarioModes, setScenarioModes,
    selectedScenarioId, setSelectedScenarioId,
    scenarioShortcuts, setScenarioShortcuts,
    cloudSyncInitialized, setCloudSyncInitialized,
    userRole, setUserRole,
    totalShortcuts,
    conflictModalOpen, setConflictModalOpen,
    pendingLocalPayload, setPendingLocalPayload,
    pendingCloudPayload, setPendingCloudPayload,
    contextMenu, setContextMenu,
    shortcutEditOpen, setShortcutEditOpen,
    shortcutModalMode, setShortcutModalMode,
    shortcutDeleteOpen, setShortcutDeleteOpen,
    selectedShortcut, setSelectedShortcut,
    editingTitle, setEditingTitle,
    editingUrl, setEditingUrl,
    isDragging, setIsDragging,
    currentEditScenarioId, setCurrentEditScenarioId,
    currentInsertIndex, setCurrentInsertIndex,
    shortcuts,
    localDirtyRef, lastSavedShortcutsJson,
    handleCreateScenarioMode, handleOpenEditScenarioMode, handleUpdateScenarioMode, handleDeleteScenarioMode,
    handleShortcutOpen, handleShortcutContextMenu, handlePageContextMenu,
    handleSaveShortcutEdit, handleConfirmDeleteShortcut, handlePageReorder,
    moveShortcutToPage,
    findOrCreateAvailableIndex, handleDeletePage, getMaxPageIndex, contextMenuRef,
    resolveWithCloud, resolveWithLocal,
    resetLocalShortcutsByRole,
    scenarioModeOpen, setScenarioModeOpen,
    scenarioCreateOpen, setScenarioCreateOpen,
    scenarioEditOpen, setScenarioEditOpen
  };
}
