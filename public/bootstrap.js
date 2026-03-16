(() => {
  const targetPath = 'index.html?nt=1';
  let targetUrl = targetPath;

  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      targetUrl = chrome.runtime.getURL(targetPath);
    }
  } catch {}

  window.location.replace(targetUrl);
})();
