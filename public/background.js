const WEBDAV_PROXY_MESSAGE_TYPE = 'LEAFTAB_WEBDAV_PROXY';
const DEDUPE_NEW_TAB_MESSAGE_TYPE = 'LEAFTAB_DEDUPE_NEW_TAB';
const REMOTE_SEARCH_SUGGESTIONS_MESSAGE_TYPE = 'LEAFTAB_REMOTE_SEARCH_SUGGESTIONS';
const REMOTE_SEARCH_SUGGESTIONS_PROVIDER_360 = '360';
const REMOTE_SEARCH_SUGGESTIONS_TIMEOUT_MS = 1500;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeRemoteSuggestionQuery(value) {
  return String(value || '').trim();
}

async function fetch360RemoteSearchSuggestions(query, limit) {
  const normalizedQuery = normalizeRemoteSuggestionQuery(query);
  if (!normalizedQuery) return [];

  const requestUrl = new URL('https://sug.so.360.cn/suggest');
  requestUrl.searchParams.set('word', normalizedQuery);
  requestUrl.searchParams.set('encodein', 'utf-8');
  requestUrl.searchParams.set('encodeout', 'utf-8');

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, REMOTE_SEARCH_SUGGESTIONS_TIMEOUT_MS);

  try {
    const response = await fetch(requestUrl.toString(), {
      method: 'GET',
      signal: abortController.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    });

    if (!response.ok) {
      throw new Error(`remote_suggestions_${response.status}`);
    }

    const data = await response.json();
    const rawItems = Array.isArray(data?.result) ? data.result : [];
    const items = [];
    const seen = new Set();
    const maxItems = Math.max(1, Math.min(Number(limit) || 10, 10));

    rawItems.forEach((entry) => {
      if (items.length >= maxItems) return;
      const word = typeof entry?.word === 'string' ? entry.word.trim() : '';
      if (!word) return;
      const dedupKey = word.toLowerCase();
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);
      items.push(word);
    });

    return items;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getLeafTabPagePrefixes() {
  try {
    return [
      chrome.runtime.getURL('bootstrap.html'),
      chrome.runtime.getURL('index.html'),
    ];
  } catch {
    return [];
  }
}

function isLeafTabPageUrl(url, prefixes) {
  if (typeof url !== 'string' || url.length === 0) return false;
  return prefixes.some((prefix) => typeof prefix === 'string' && prefix.length > 0 && url.startsWith(prefix));
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message) return;

  if (message.type === REMOTE_SEARCH_SUGGESTIONS_MESSAGE_TYPE) {
    const payload = message.payload || {};
    const provider = String(payload.provider || '');
    const query = normalizeRemoteSuggestionQuery(payload.query);
    const limit = Number(payload.limit) || 10;

    (async () => {
      try {
        if (provider !== REMOTE_SEARCH_SUGGESTIONS_PROVIDER_360 || !query) {
          sendResponse({ success: true, items: [] });
          return;
        }

        const items = await fetch360RemoteSearchSuggestions(query, limit);
        sendResponse({ success: true, items });
      } catch (error) {
        console.error('[LeafTab][Remote suggestions]', provider, query, error);
        sendResponse({
          success: false,
          error: String(error instanceof Error ? error.message : error),
        });
      }
    })();

    return true;
  }

  if (message.type === DEDUPE_NEW_TAB_MESSAGE_TYPE) {
    const sender = _sender;
    const senderTabId = sender?.tab?.id;
    const senderWindowId = sender?.tab?.windowId;
    const tabsApi = chrome.tabs;
    const windowsApi = chrome.windows;
    if (!isFiniteNumber(senderTabId) || !isFiniteNumber(senderWindowId) || !tabsApi?.query || !tabsApi?.update || !tabsApi?.remove) {
      sendResponse({ action: 'redirect' });
      return;
    }

    const leafTabPrefixes = getLeafTabPagePrefixes();
    if (leafTabPrefixes.length === 0) {
      sendResponse({ action: 'redirect' });
      return;
    }

    tabsApi.query({ windowId: senderWindowId }, (tabs) => {
      if (chrome.runtime.lastError || !Array.isArray(tabs)) {
        sendResponse({ action: 'redirect' });
        return;
      }

      const candidateTabs = tabs
        .filter((tab) => isFiniteNumber(tab?.id) && isLeafTabPageUrl(tab?.url, leafTabPrefixes))
        .sort((left, right) => (left.id || 0) - (right.id || 0));

      const keepTab = candidateTabs[0];
      if (!keepTab || keepTab.id === senderTabId) {
        sendResponse({ action: 'redirect' });
        return;
      }

      sendResponse({ action: 'focus-existing', tabId: keepTab.id });

      if (isFiniteNumber(keepTab.windowId) && windowsApi?.update) {
        windowsApi.update(keepTab.windowId, { focused: true }, () => {});
      }
      tabsApi.update(keepTab.id, { active: true }, () => {
        if (chrome.runtime.lastError) return;
        tabsApi.reload?.(keepTab.id, () => {});
      });
      tabsApi.remove(senderTabId, () => {});
    });

    return true;
  }

  if (message.type !== WEBDAV_PROXY_MESSAGE_TYPE) return;

  const payload = message.payload || {};
  const method = String(payload.method || 'GET').toUpperCase();
  const url = typeof payload.url === 'string' ? payload.url : '';
  const rawHeaders = payload.headers && typeof payload.headers === 'object' ? payload.headers : {};
  const body = typeof payload.body === 'string' ? payload.body : undefined;

  if (!url) {
    sendResponse({ success: false, error: 'Invalid WebDAV URL' });
    return;
  }

  const headers = {};
  Object.entries(rawHeaders).forEach(([key, value]) => {
    if (typeof value === 'string') headers[key] = value;
  });

  (async () => {
    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
      });
      const responseText = await response.text();
      sendResponse({
        success: true,
        status: response.status,
        ok: response.ok,
        bodyText: responseText,
      });
    } catch (error) {
      console.error('[LeafTab][WebDAV proxy]', method, url, error);
      sendResponse({
        success: false,
        error: String(error instanceof Error ? error.message : error),
      });
    }
  })();

  return true;
});
