export const LOCAL_PROFILE_UPDATED_MESSAGE_TYPE = 'LEAFTAB_LOCAL_PROFILE_UPDATED';

export const emitLocalProfileUpdated = () => {
  try {
    window.dispatchEvent(new Event(LOCAL_PROFILE_UPDATED_MESSAGE_TYPE));
  } catch {}

  try {
    if (typeof chrome === 'undefined' || !chrome.runtime?.id || typeof chrome.runtime.sendMessage !== 'function') {
      return;
    }

    chrome.runtime.sendMessage({ type: LOCAL_PROFILE_UPDATED_MESSAGE_TYPE }, () => {
      void chrome.runtime?.lastError;
    });
  } catch {}
};
