import i18n from 'i18next';
import type { BackendModule } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const SUPPORTED_LANGUAGES = ['zh', 'zh-TW', 'en', 'vi', 'ja', 'ko'] as const;

type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
type LocaleModule = {
  default: {
    translation: Record<string, unknown>;
  };
};

const localeLoaders: Record<SupportedLanguage, () => Promise<LocaleModule>> = {
  zh: () => import('./locales/zh'),
  'zh-TW': () => import('./locales/zh-TW'),
  en: () => import('./locales/en'),
  vi: () => import('./locales/vi'),
  ja: () => import('./locales/ja'),
  ko: () => import('./locales/ko'),
};

function normalizeLanguage(language: string): SupportedLanguage {
  const normalized = String(language || '').trim().toLowerCase();
  if (!normalized) return 'en';
  if (normalized === 'zh-tw' || normalized === 'zh-hk') return 'zh-TW';
  if (normalized.startsWith('zh')) return 'zh';
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized.startsWith('ko')) return 'ko';
  if (normalized.startsWith('vi')) return 'vi';
  return 'en';
}

const dynamicLocaleBackend: BackendModule = {
  type: 'backend',
  init: () => {},
  read: async (language, namespace, callback) => {
    try {
      const loader = localeLoaders[normalizeLanguage(language)];
      const module = await loader();
      const namespaceData = module.default?.[namespace as 'translation'] || module.default.translation;
      callback(null, namespaceData);
    } catch (error) {
      callback(error as Error, false);
    }
  },
};

export const i18nReady = i18n
  .use(dynamicLocaleBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init(({
    fallbackLng: 'en',
    debug: false,
    logger: {
      log: (...args: any[]) => {
        const first = args[0];
        if (typeof first === 'string' && first.includes('locize.com')) return;
        if (typeof console !== 'undefined' && typeof console.log === 'function') console.log(...args);
      },
      warn: (...args: any[]) => {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') console.warn(...args);
      },
      error: (...args: any[]) => {
        if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(...args);
      },
    },
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: [],
      lookupLocalStorage: 'i18nextLng'
    },
    react: {
      useSuspense: false,
    },
    ns: ['translation'],
    defaultNS: 'translation',
    nonExplicitSupportedLngs: true,
    supportedLngs: SUPPORTED_LANGUAGES,
  } as any));

export default i18n;
