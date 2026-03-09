import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zh from './locales/zh';
import zhTW from './locales/zh-TW';
import en from './locales/en';
import vi from './locales/vi';
import ja from './locales/ja';
import ko from './locales/ko';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init(({
    resources: {
      zh,
      'zh-TW': zhTW,
      en,
      vi,
      ja,
      ko
    },
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
    nonExplicitSupportedLngs: true,
    supportedLngs: ['zh', 'zh-TW', 'en', 'vi', 'ja', 'ko']
  } as any));

export default i18n;
