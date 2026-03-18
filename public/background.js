const WEBDAV_PROXY_MESSAGE_TYPE = 'LEAFTAB_WEBDAV_PROXY';
const DEDUPE_NEW_TAB_MESSAGE_TYPE = 'LEAFTAB_DEDUPE_NEW_TAB';

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
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
      tabsApi.update(keepTab.id, { active: true }, () => {});
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
      sendResponse({
        success: false,
        error: String(error instanceof Error ? error.message : error),
      });
    }
  })();

  return true;
});
