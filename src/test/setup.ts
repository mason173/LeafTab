import React from 'react';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    theme: 'light',
    setTheme: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const template = typeof options?.defaultValue === 'string'
        ? options.defaultValue
        : key;
      return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, token) => String(options?.[token] ?? ''));
    },
    i18n: {
      language: 'en',
    },
  }),
}));

vi.mock('@/components/ShortcutIcon', () => ({
  default: ({ url }: { url: string }) => React.createElement('span', { 'data-testid': 'shortcut-icon' }, url),
}));

if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

afterEach(() => {
  cleanup();
});
