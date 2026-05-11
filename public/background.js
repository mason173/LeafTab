const WEBDAV_PROXY_MESSAGE_TYPE = 'LEAFTAB_WEBDAV_PROXY';
const WEBDAV_AUTO_SYNC_CONFIG_MESSAGE_TYPE = 'LEAFTAB_WEBDAV_AUTO_SYNC_CONFIG';
const WEBDAV_AUTO_SYNC_TRIGGER_MESSAGE_TYPE = 'LEAFTAB_WEBDAV_AUTO_SYNC_TRIGGER';
const WEBDAV_AUTO_SYNC_ALARM_NAME = 'leaftab-webdav-auto-sync';
const WEBDAV_AUTO_SYNC_STATE_STORAGE_KEY = 'leaftab_webdav_auto_sync_alarm_state_v1';
const DEDUPE_NEW_TAB_MESSAGE_TYPE = 'LEAFTAB_DEDUPE_NEW_TAB';
const REMOTE_SEARCH_SUGGESTIONS_MESSAGE_TYPE = 'LEAFTAB_REMOTE_SEARCH_SUGGESTIONS';
const OPEN_AI_CHAT_MESSAGE_TYPE = 'LEAFTAB_OPEN_AI_CHAT';
const REMOTE_SEARCH_SUGGESTIONS_PROVIDER_360 = '360';
const REMOTE_SEARCH_SUGGESTIONS_TIMEOUT_MS = 1500;
const OPEN_AI_CHAT_TIMEOUT_MS = 20000;
const WEBDAV_PROXY_TIMEOUT_MS = 20000;
const WEBDAV_AUTO_SYNC_TRIGGER_TIMEOUT_MS = 15000;
const WEBDAV_AUTO_SYNC_BUSY_RETRY_MS = 30 * 1000;
const WEBDAV_AUTO_SYNC_NO_PAGE_RETRY_MS = 5 * 60 * 1000;

const AI_PROVIDER_TARGETS = {
  chatgpt: 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/app',
  claude: 'https://claude.ai/new',
  grok: 'https://grok.com/',
  kimi: 'https://www.kimi.com/',
  perplexity: 'https://www.perplexity.ai/',
  doubao: 'https://www.doubao.com/chat/',
  deepseek: 'https://chat.deepseek.com/',
  qwen: 'https://chat.qwen.ai/',
  yuanbao: 'https://yuanbao.tencent.com/',
  copilot: 'https://copilot.microsoft.com/',
};

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getStorageLocal() {
  return chrome.storage && chrome.storage.local ? chrome.storage.local : null;
}

function storageGet(key) {
  return new Promise((resolve) => {
    const storage = getStorageLocal();
    if (!storage || typeof storage.get !== 'function') {
      resolve({});
      return;
    }
    storage.get(key, (result) => {
      if (chrome.runtime.lastError) {
        resolve({});
        return;
      }
      resolve(result || {});
    });
  });
}

function storageSet(items) {
  return new Promise((resolve) => {
    const storage = getStorageLocal();
    if (!storage || typeof storage.set !== 'function') {
      resolve();
      return;
    }
    storage.set(items, () => {
      resolve();
    });
  });
}

function storageRemove(key) {
  return new Promise((resolve) => {
    const storage = getStorageLocal();
    if (!storage || typeof storage.remove !== 'function') {
      resolve();
      return;
    }
    storage.remove(key, () => {
      resolve();
    });
  });
}

function alarmsCreate(name, info) {
  return new Promise((resolve) => {
    if (!chrome.alarms || typeof chrome.alarms.create !== 'function') {
      resolve();
      return;
    }
    chrome.alarms.create(name, info);
    resolve();
  });
}

function alarmsClear(name) {
  return new Promise((resolve) => {
    if (!chrome.alarms || typeof chrome.alarms.clear !== 'function') {
      resolve(false);
      return;
    }
    chrome.alarms.clear(name, (wasCleared) => {
      resolve(Boolean(wasCleared));
    });
  });
}

function normalizeWebdavAutoSyncState(payload) {
  const enabled = payload && payload.enabled === true;
  const nextSyncAt = typeof payload?.nextSyncAt === 'string' ? payload.nextSyncAt : null;
  const nextMs = nextSyncAt ? new Date(nextSyncAt).getTime() : Number.NaN;
  const intervalMinutes = Number(payload?.intervalMinutes);
  return {
    enabled,
    nextSyncAt: Number.isFinite(nextMs) ? new Date(nextMs).toISOString() : null,
    intervalMinutes: Number.isFinite(intervalMinutes) ? Math.max(1, Math.round(intervalMinutes)) : null,
    savedAt: new Date().toISOString(),
  };
}

async function readWebdavAutoSyncState() {
  const result = await storageGet(WEBDAV_AUTO_SYNC_STATE_STORAGE_KEY);
  return normalizeWebdavAutoSyncState(result[WEBDAV_AUTO_SYNC_STATE_STORAGE_KEY] || {});
}

async function clearWebdavAutoSyncAlarmState() {
  await alarmsClear(WEBDAV_AUTO_SYNC_ALARM_NAME);
  await storageRemove(WEBDAV_AUTO_SYNC_STATE_STORAGE_KEY);
}

async function scheduleWebdavAutoSyncAlarm(state) {
  const normalized = normalizeWebdavAutoSyncState(state);
  if (!normalized.enabled || !normalized.nextSyncAt) {
    await clearWebdavAutoSyncAlarmState();
    return normalized;
  }

  const nextMs = Math.max(Date.now() + 200, new Date(normalized.nextSyncAt).getTime());
  const scheduledState = {
    ...normalized,
    nextSyncAt: new Date(nextMs).toISOString(),
  };
  await storageSet({
    [WEBDAV_AUTO_SYNC_STATE_STORAGE_KEY]: scheduledState,
  });
  await alarmsCreate(WEBDAV_AUTO_SYNC_ALARM_NAME, { when: nextMs });
  return scheduledState;
}

async function hasLeafTabPageOpen() {
  try {
    const leafTabPrefixes = getLeafTabPagePrefixes();
    if (leafTabPrefixes.length === 0) return true;
    const tabs = await queryTabs({});
    return tabs.some((tab) => isLeafTabPageUrl(tab?.url, leafTabPrefixes));
  } catch {
    return true;
  }
}

function sendWebdavAutoSyncTriggerToPages() {
  return new Promise((resolve) => {
    if (!chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
      resolve(null);
      return;
    }

    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, WEBDAV_AUTO_SYNC_TRIGGER_TIMEOUT_MS);

    chrome.runtime.sendMessage({
      type: WEBDAV_AUTO_SYNC_TRIGGER_MESSAGE_TYPE,
      payload: {
        firedAt: new Date().toISOString(),
      },
    }, (response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response || null);
    });
  });
}

async function handleWebdavAutoSyncAlarm() {
  const state = await readWebdavAutoSyncState();
  if (!state.enabled) {
    await clearWebdavAutoSyncAlarmState();
    return;
  }

  const hasPage = await hasLeafTabPageOpen();
  if (!hasPage) {
    await scheduleWebdavAutoSyncAlarm({
      ...state,
      nextSyncAt: new Date(Date.now() + WEBDAV_AUTO_SYNC_NO_PAGE_RETRY_MS).toISOString(),
    });
    return;
  }

  const response = await sendWebdavAutoSyncTriggerToPages();
  if (response?.enabled === false) {
    await clearWebdavAutoSyncAlarmState();
    return;
  }

  if (typeof response?.nextSyncAt === 'string') {
    await scheduleWebdavAutoSyncAlarm({
      ...state,
      enabled: true,
      nextSyncAt: response.nextSyncAt,
    });
    return;
  }

  const retryAfterMs = Number(response?.retryAfterMs);
  await scheduleWebdavAutoSyncAlarm({
    ...state,
    enabled: true,
    nextSyncAt: new Date(Date.now() + (
      Number.isFinite(retryAfterMs) && retryAfterMs > 0
        ? retryAfterMs
        : WEBDAV_AUTO_SYNC_BUSY_RETRY_MS
    )).toISOString(),
  });
}

function createTab(url) {
  return new Promise((resolve, reject) => {
    const tabsApi = chrome.tabs;
    if (!tabsApi || typeof tabsApi.create !== 'function') {
      reject(new Error('tabs_create_unavailable'));
      return;
    }
    tabsApi.create({ url, active: true }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(tab);
    });
  });
}

function queryTabs(queryInfo) {
  return new Promise((resolve, reject) => {
    const tabsApi = chrome.tabs;
    if (!tabsApi || typeof tabsApi.query !== 'function') {
      reject(new Error('tabs_query_unavailable'));
      return;
    }
    tabsApi.query(queryInfo, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(tabs || []);
    });
  });
}

function updateTab(tabId, updateProperties) {
  return new Promise((resolve, reject) => {
    const tabsApi = chrome.tabs;
    if (!tabsApi || typeof tabsApi.update !== 'function') {
      reject(new Error('tabs_update_unavailable'));
      return;
    }
    tabsApi.update(tabId, updateProperties, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(tab);
    });
  });
}

function focusWindow(windowId) {
  return new Promise((resolve, reject) => {
    const windowsApi = chrome.windows;
    if (!windowsApi || typeof windowsApi.update !== 'function') {
      resolve();
      return;
    }
    windowsApi.update(windowId, { focused: true }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function getTab(tabId) {
  return new Promise((resolve, reject) => {
    const tabsApi = chrome.tabs;
    if (!tabsApi || typeof tabsApi.get !== 'function') {
      reject(new Error('tabs_get_unavailable'));
      return;
    }
    tabsApi.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(tab);
    });
  });
}

function getAiProviderUrlPatterns(providerId, targetUrl) {
  const patternsByProvider = {
    chatgpt: ['https://chatgpt.com/*'],
    gemini: ['https://gemini.google.com/*'],
    claude: ['https://claude.ai/*'],
    grok: ['https://grok.com/*'],
    kimi: ['https://www.kimi.com/*', 'https://kimi.com/*'],
    perplexity: ['https://www.perplexity.ai/*', 'https://perplexity.ai/*'],
    doubao: ['https://www.doubao.com/*'],
    deepseek: ['https://chat.deepseek.com/*'],
    qwen: ['https://chat.qwen.ai/*', 'https://qwen.ai/*'],
    yuanbao: ['https://yuanbao.tencent.com/*'],
    copilot: ['https://copilot.microsoft.com/*'],
  };

  const presetPatterns = patternsByProvider[providerId];
  if (Array.isArray(presetPatterns) && presetPatterns.length > 0) {
    return presetPatterns;
  }

  try {
    const normalizedUrl = new URL(targetUrl);
    return [`${normalizedUrl.origin}/*`];
  } catch {
    return [targetUrl];
  }
}

async function findExistingAiProviderTab(providerId, targetUrl) {
  const patterns = getAiProviderUrlPatterns(providerId, targetUrl);
  const tabs = await queryTabs({ url: patterns });
  if (!Array.isArray(tabs) || tabs.length === 0) {
    return null;
  }

  const eligibleTabs = tabs.filter((tab) => isFiniteNumber(tab.id));
  if (eligibleTabs.length === 0) {
    return null;
  }

  eligibleTabs.sort((left, right) => {
    const leftActiveScore = left.active ? 1 : 0;
    const rightActiveScore = right.active ? 1 : 0;
    if (leftActiveScore !== rightActiveScore) {
      return rightActiveScore - leftActiveScore;
    }

    const leftLastAccessed = Number(left.lastAccessed) || 0;
    const rightLastAccessed = Number(right.lastAccessed) || 0;
    return rightLastAccessed - leftLastAccessed;
  });

  return eligibleTabs[0] || null;
}

async function focusExistingTab(tab) {
  if (!tab || !isFiniteNumber(tab.id)) {
    throw new Error('focus_existing_tab_missing_id');
  }

  if (isFiniteNumber(tab.windowId)) {
    await focusWindow(tab.windowId);
  }

  return updateTab(tab.id, { active: true });
}

function executeScript(args) {
  return new Promise((resolve, reject) => {
    const scriptingApi = chrome.scripting;
    if (!scriptingApi || typeof scriptingApi.executeScript !== 'function') {
      reject(new Error('scripting_unavailable'));
      return;
    }
    scriptingApi.executeScript(args, (results) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(results || []);
    });
  });
}

async function injectAiPasteNoticeIntoTab(tabId, payload) {
  const deadline = Date.now() + OPEN_AI_CHAT_TIMEOUT_MS;
  let lastKnownError = null;
  let noticeShownOnce = false;

  while (Date.now() < deadline) {
    const tab = await getTab(tabId);
    if (!tab) {
      throw new Error('target_tab_missing');
    }

    try {
      const results = await executeScript({
        target: { tabId },
        func: (injectedPayload) => {
          const message = String(injectedPayload && injectedPayload.noticeMessage || '').trim();
          const noticeTheme = injectedPayload && typeof injectedPayload.noticeTheme === 'object'
            ? injectedPayload.noticeTheme
            : {};
          const primaryColor = String(noticeTheme && noticeTheme.primaryColor || '').trim() || '#3b82f6';
          const foregroundColor = String(noticeTheme && noticeTheme.foregroundColor || '').trim() || '#ffffff';
          if (!message) {
            return { status: 'opened' };
          }

          if (!document.documentElement) {
            return { status: 'retry', error: 'document_root_missing' };
          }

          const rootId = 'leaftab-ai-paste-notice';
          const existing = document.getElementById(rootId);
          if (existing) {
            return { status: 'present' };
          }

          const host = document.createElement('div');
          host.id = rootId;
          host.setAttribute('data-leaftab-owned', 'true');
          host.style.position = 'fixed';
          host.style.inset = '0 auto auto 50%';
          host.style.transform = 'translateX(-50%)';
          host.style.zIndex = '2147483600';
          host.style.width = 'min(calc(100vw - 1.5rem), 460px)';
          host.style.pointerEvents = 'none';

          const shadowRoot = host.attachShadow({ mode: 'open' });
          const style = document.createElement('style');
          style.textContent = `
            :host {
              all: initial;
            }

            .viewport {
              pointer-events: none;
              box-sizing: border-box;
              display: flex;
              width: 100%;
              flex-direction: column;
              align-items: center;
              gap: 8px;
              padding-top: 16px;
              font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            .toast {
              pointer-events: auto;
              box-sizing: border-box;
              display: flex;
              width: 100%;
              align-items: center;
              gap: 8px;
              border-radius: 999px;
              padding: 10px 16px;
              background: ${primaryColor};
              color: ${foregroundColor};
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.18), 0 4px 6px -4px rgba(0, 0, 0, 0.16);
              outline: 1px solid color-mix(in oklab, ${primaryColor} 35%, transparent);
              animation: leaftab-toast-enter 180ms ease-out forwards;
            }

            .toast.closing {
              animation: leaftab-toast-exit 180ms ease-in forwards;
            }

            .icon {
              display: inline-flex;
              width: 16px;
              height: 16px;
              flex-shrink: 0;
            }

            .content {
              min-width: 0;
            }

            .title {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              font-size: 14px;
              font-weight: 500;
              line-height: 20px;
            }

            @keyframes leaftab-toast-enter {
              from {
                opacity: 0;
                transform: translateY(-8px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            @keyframes leaftab-toast-exit {
              from {
                opacity: 1;
                transform: translateY(0);
              }
              to {
                opacity: 0;
                transform: translateY(-4px);
              }
            }
          `;

          const viewport = document.createElement('div');
          viewport.className = 'viewport';

          const toast = document.createElement('div');
          toast.className = 'toast';
          toast.setAttribute('role', 'status');

          const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          icon.setAttribute('viewBox', '0 0 24 24');
          icon.setAttribute('aria-hidden', 'true');
          icon.setAttribute('class', 'icon');
          const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          iconPath.setAttribute('fill', 'currentColor');
          iconPath.setAttribute('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 15a1.25 1.25 0 1 1 0 2.5A1.25 1.25 0 0 1 12 17Zm1.1-3.9V15h-2.2v-5.6h2.2v3.7Z');
          icon.appendChild(iconPath);

          const content = document.createElement('div');
          content.className = 'content';

          const title = document.createElement('div');
          title.className = 'title';
          title.textContent = message;

          content.appendChild(title);
          toast.appendChild(icon);
          toast.appendChild(content);
          viewport.appendChild(toast);
          shadowRoot.appendChild(style);
          shadowRoot.appendChild(viewport);
          document.documentElement.appendChild(host);

          window.setTimeout(() => {
            toast.classList.add('closing');
          }, 4800);

          window.setTimeout(() => {
            host.remove();
          }, 4980);

          return { status: 'opened' };
        },
        args: [payload],
      });
      const result = results[0] && results[0].result;
      if (result?.status === 'opened' || result?.status === 'present') {
        noticeShownOnce = true;
        return { status: 'opened' };
      } else if (result?.status === 'retry') {
        lastKnownError = result.error || 'notice_retry_requested';
      } else if (result) {
        return result;
      } else {
        lastKnownError = 'empty_notice_result';
      }
    } catch (error) {
      lastKnownError = String(error instanceof Error ? error.message : error);
    }

    if (noticeShownOnce) {
      return { status: 'opened' };
    }

    await sleep(120);
  }

  return {
    status: 'opened',
    error: lastKnownError || 'notice_timeout',
  };
}

async function injectAiPromptIntoTab(tabId, payload) {
  const deadline = Date.now() + OPEN_AI_CHAT_TIMEOUT_MS;
  let lastKnownError = null;

  while (Date.now() < deadline) {
    const tab = await getTab(tabId);
    if (!tab) {
      throw new Error('target_tab_missing');
    }

    if (tab.status !== 'complete') {
      await sleep(500);
      continue;
    }

    try {
      const results = await executeScript({
        target: { tabId },
        func: async (injectedPayload) => {
          const providerId = String(injectedPayload && injectedPayload.providerId || '');
          const prompt = String(injectedPayload && injectedPayload.prompt || '');
          const autoSend = injectedPayload && injectedPayload.autoSend !== false;
          const composerSelectorMap = {
            chatgpt: [
              '#prompt-textarea',
              'textarea[data-testid]',
              'textarea',
              '[contenteditable="true"][role="textbox"]',
            ],
            gemini: [
              'div[contenteditable="true"][role="textbox"]',
              'rich-textarea div[contenteditable="true"]',
              '[contenteditable="true"][aria-label]',
              'textarea',
            ],
            claude: [
              'div[contenteditable="true"][role="textbox"]',
              'div[contenteditable="true"][data-testid*="composer"]',
              'textarea',
              '[contenteditable="true"]',
            ],
            grok: [
              'textarea',
              'div[contenteditable="true"][role="textbox"]',
              '[contenteditable="true"]',
            ],
            kimi: [
              'textarea',
              'div[contenteditable="true"][role="textbox"]',
              '[contenteditable="true"]',
            ],
            perplexity: [
              'textarea',
              'div[contenteditable="true"][role="textbox"]',
              '[contenteditable="true"]',
            ],
            doubao: [
              'textarea',
              'div[contenteditable="true"][role="textbox"]',
              '[contenteditable="true"]',
            ],
            deepseek: [
              'textarea',
              'div[contenteditable="true"][role="textbox"]',
              '[contenteditable="true"]',
            ],
            qwen: [
              'textarea',
              'div[contenteditable="true"][role="textbox"]',
              '[contenteditable="true"]',
            ],
            yuanbao: [
              'textarea',
              'div[contenteditable="true"][role="textbox"]',
              '[contenteditable="true"]',
            ],
            copilot: [
              'textarea',
              'div[contenteditable="true"][role="textbox"]',
              '[contenteditable="true"]',
            ],
          };
          const submitSelectorMap = {
            chatgpt: [
              'button[data-testid="send-button"]',
              'button[aria-label*="Send"]',
              'button[aria-label*="发送"]',
              'button[type="submit"]',
            ],
            gemini: [
              'button[aria-label*="Send"]',
              'button[aria-label*="发送"]',
              'button[type="submit"]',
            ],
            claude: [
              'button[aria-label*="Send"]',
              'button[aria-label*="发送"]',
              'button[type="submit"]',
            ],
            grok: [
              'button[aria-label*="Send"]',
              'button[aria-label*="发送"]',
              'button[type="submit"]',
            ],
            kimi: [
              'button[aria-label*="发送"]',
              'button[aria-label*="Send"]',
              'button[type="submit"]',
            ],
            perplexity: [
              'button[aria-label*="Send"]',
              'button[aria-label*="发送"]',
              'button[type="submit"]',
            ],
            doubao: [
              'button[aria-label*="发送"]',
              'button[aria-label*="Send"]',
              'button[type="submit"]',
            ],
            deepseek: [
              'button[aria-label*="发送"]',
              'button[aria-label*="Send"]',
              'button[type="submit"]',
            ],
            qwen: [
              'button[aria-label*="发送"]',
              'button[aria-label*="Send"]',
              'button[type="submit"]',
            ],
            yuanbao: [
              'button[aria-label*="发送"]',
              'button[aria-label*="Send"]',
              'button[type="submit"]',
            ],
            copilot: [
              'button[aria-label*="Send"]',
              'button[aria-label*="发送"]',
              'button[type="submit"]',
            ],
          };

          function isElementVisible(element) {
            if (!(element instanceof HTMLElement)) return false;
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            return rect.width > 0
              && rect.height > 0
              && style.visibility !== 'hidden'
              && style.display !== 'none';
          }

          function getValueSetter(element) {
            const prototype = Object.getPrototypeOf(element);
            return Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
          }

          function dispatchEditableInputEvents(element, value) {
            element.dispatchEvent(new InputEvent('input', {
              bubbles: true,
              data: value,
              inputType: 'insertText',
            }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }

          function setPromptValue(element, value) {
            if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
              element.focus();
              const valueSetter = getValueSetter(element);
              if (valueSetter) {
                valueSetter.call(element, value);
              } else {
                element.value = value;
              }
              dispatchEditableInputEvents(element, value);
              return true;
            }

            if (element instanceof HTMLElement && element.isContentEditable) {
              element.focus();
              element.textContent = '';
              const selection = window.getSelection();
              if (selection) {
                const range = document.createRange();
                range.selectNodeContents(element);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
              }
              const inserted = typeof document.execCommand === 'function'
                ? document.execCommand('insertText', false, value)
                : false;
              if (!inserted) {
                element.textContent = value;
              }
              dispatchEditableInputEvents(element, value);
              return true;
            }

            return false;
          }

          function findFirstVisible(selectors) {
            for (const selector of selectors) {
              const matches = Array.from(document.querySelectorAll(selector));
              for (const match of matches) {
                if (isElementVisible(match)) return match;
              }
            }
            return null;
          }

          function findSubmitButton(selectors) {
            const directMatch = findFirstVisible(selectors);
            if (directMatch instanceof HTMLElement && !directMatch.hasAttribute('disabled') && directMatch.getAttribute('aria-disabled') !== 'true') {
              return directMatch;
            }

            const fallbackCandidates = Array.from(document.querySelectorAll('button, [role="button"]'));
            const labelPattern = /(send|发送|提交|发送消息)/i;
            for (const candidate of fallbackCandidates) {
              if (!(candidate instanceof HTMLElement) || !isElementVisible(candidate)) continue;
              const label = [
                candidate.getAttribute('aria-label'),
                candidate.getAttribute('title'),
                candidate.textContent,
              ].join(' ');
              if (!labelPattern.test(label)) continue;
              if (candidate.hasAttribute('disabled') || candidate.getAttribute('aria-disabled') === 'true') continue;
              return candidate;
            }
            return null;
          }

          const composerSelectors = composerSelectorMap[providerId] || composerSelectorMap.chatgpt;
          const composer = findFirstVisible(composerSelectors);
          if (!composer) {
            return {
              status: 'not-found',
              providerId,
              error: 'composer_not_found',
            };
          }

          if (!prompt) {
            return {
              status: 'opened',
              providerId,
            };
          }

          const promptApplied = setPromptValue(composer, prompt);
          if (!promptApplied) {
            return {
              status: 'not-found',
              providerId,
              error: 'composer_not_editable',
            };
          }

          if (!autoSend) {
            return {
              status: 'filled',
              providerId,
            };
          }

          for (let index = 0; index < 8; index += 1) {
            const submitButton = findSubmitButton(submitSelectorMap[providerId] || submitSelectorMap.chatgpt);
            if (submitButton) {
              submitButton.click();
              return {
                status: 'sent',
                providerId,
              };
            }
            await new Promise((resolve) => {
              window.setTimeout(resolve, 150);
            });
          }

          return {
            status: 'filled',
            providerId,
            error: 'submit_button_not_found',
          };
        },
        args: [payload],
      });
      const result = results[0] && results[0].result;
      if (!result) {
        lastKnownError = 'empty_injection_result';
      } else if (result.status === 'not-found') {
        lastKnownError = result.error || 'composer_not_found';
      } else {
        return result;
      }
    } catch (error) {
      lastKnownError = String(error instanceof Error ? error.message : error);
    }

    await sleep(900);
  }

  return {
    status: 'opened',
    providerId: payload.providerId,
    error: lastKnownError || 'automation_timeout',
  };
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

  if (message.type === WEBDAV_AUTO_SYNC_CONFIG_MESSAGE_TYPE) {
    const payload = message.payload || {};
    (async () => {
      try {
        const state = await scheduleWebdavAutoSyncAlarm(payload);
        sendResponse({
          success: true,
          state,
        });
      } catch (error) {
        console.error('[LeafTab][WebDAV auto sync alarm]', error);
        sendResponse({
          success: false,
          error: String(error instanceof Error ? error.message : error),
        });
      }
    })();
    return true;
  }

  if (message.type === OPEN_AI_CHAT_MESSAGE_TYPE) {
    const payload = message.payload || {};
    const providerId = String(payload.providerId || '');
    const prompt = typeof payload.prompt === 'string' ? payload.prompt : '';
    const autoSend = payload.autoSend !== false;
    const noticeMessage = typeof payload.noticeMessage === 'string' ? payload.noticeMessage : '';
    const targetUrl = AI_PROVIDER_TARGETS[providerId];

    (async () => {
      try {
        if (!targetUrl) {
          sendResponse({ success: false, error: 'unsupported_ai_provider' });
          return;
        }

        const existingTab = await findExistingAiProviderTab(providerId, targetUrl);
        const targetTab = existingTab
          ? await focusExistingTab(existingTab)
          : await createTab(targetUrl);
        const tabId = targetTab && targetTab.id;
        if (!isFiniteNumber(tabId)) {
          throw new Error(existingTab ? 'existing_tab_missing_id' : 'created_tab_missing_id');
        }

        if (!prompt.trim()) {
          if (noticeMessage.trim()) {
            await injectAiPasteNoticeIntoTab(tabId, {
              noticeMessage,
            });
          }
          sendResponse({
            success: true,
            result: {
              status: 'opened',
              providerId,
              tabId,
            },
          });
          return;
        }

        const result = await injectAiPromptIntoTab(tabId, {
          providerId,
          prompt,
          autoSend,
        });
        sendResponse({
          success: true,
          result: {
            ...result,
            tabId,
          },
        });
      } catch (error) {
        console.error('[LeafTab][Open AI Chat]', providerId, error);
        sendResponse({
          success: false,
          error: String(error instanceof Error ? error.message : error),
        });
      }
    })();

    return true;
  }

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
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, WEBDAV_PROXY_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: abortController.signal,
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
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  return true;
});

if (chrome.alarms?.onAlarm?.addListener) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm?.name !== WEBDAV_AUTO_SYNC_ALARM_NAME) return;
    void handleWebdavAutoSyncAlarm().catch((error) => {
      console.error('[LeafTab][WebDAV auto sync alarm]', error);
    });
  });
}

if (chrome.runtime?.onStartup?.addListener) {
  chrome.runtime.onStartup.addListener(() => {
    void readWebdavAutoSyncState()
      .then((state) => scheduleWebdavAutoSyncAlarm(state))
      .catch((error) => {
        console.error('[LeafTab][WebDAV auto sync startup]', error);
      });
  });
}

if (chrome.runtime?.onInstalled?.addListener) {
  chrome.runtime.onInstalled.addListener(() => {
    void readWebdavAutoSyncState()
      .then((state) => scheduleWebdavAutoSyncAlarm(state))
      .catch((error) => {
        console.error('[LeafTab][WebDAV auto sync installed]', error);
      });
  });
}
