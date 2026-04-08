import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import './index.css';
import i18n, { i18nReady } from './i18n';
import { PopupApp } from '@/popup/PopupApp';

function toDocumentLanguage(language: string) {
  const normalized = String(language || '').trim().toLowerCase();
  if (normalized === 'zh-tw' || normalized === 'zh-hk') return 'zh-TW';
  if (normalized.startsWith('zh')) return 'zh-CN';
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized.startsWith('ko')) return 'ko';
  if (normalized.startsWith('vi')) return 'vi';
  return 'en';
}

function syncDocumentLanguage(language: string) {
  const resolvedLanguage = toDocumentLanguage(language);
  document.documentElement.lang = resolvedLanguage;
  document.body.lang = resolvedLanguage;
}

await i18nReady;
syncDocumentLanguage(i18n.language);
i18n.on('languageChanged', syncDocumentLanguage);
document.documentElement.dataset.popup = 'true';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <PopupApp />
  </ThemeProvider>,
);
