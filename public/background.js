const WEBDAV_PROXY_MESSAGE_TYPE = 'LEAFTAB_WEBDAV_PROXY';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== WEBDAV_PROXY_MESSAGE_TYPE) return;

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
