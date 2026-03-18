(() => {
  const PREVENT_DUPLICATE_NEWTAB_KEY = 'leaftab_prevent_duplicate_newtab';
  const DEDUPE_NEW_TAB_MESSAGE_TYPE = 'LEAFTAB_DEDUPE_NEW_TAB';
  const targetPath = 'index.html?nt=1';
  let targetUrl = targetPath;

  const readStoredBoolean = (key, defaultValue) => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw) === true;
    } catch {
      return defaultValue;
    }
  };

  const redirectToTarget = () => {
    window.location.replace(targetUrl);
  };

  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      targetUrl = chrome.runtime.getURL(targetPath);
    }
  } catch {}

  if (!readStoredBoolean(PREVENT_DUPLICATE_NEWTAB_KEY, false)) {
    redirectToTarget();
    return;
  }

  try {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      redirectToTarget();
      return;
    }

    let resolved = false;
    const finishWithRedirect = () => {
      if (resolved) return;
      resolved = true;
      redirectToTarget();
    };
    const timeoutId = window.setTimeout(finishWithRedirect, 400);

    chrome.runtime.sendMessage({ type: DEDUPE_NEW_TAB_MESSAGE_TYPE }, (response) => {
      if (resolved) return;
      window.clearTimeout(timeoutId);
      if (chrome.runtime?.lastError) {
        finishWithRedirect();
        return;
      }
      if (response?.action === 'focus-existing') {
        resolved = true;
        return;
      }
      finishWithRedirect();
    });
  } catch {
    redirectToTarget();
  }
})();
