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
  .init({
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
  });

export default i18n;
