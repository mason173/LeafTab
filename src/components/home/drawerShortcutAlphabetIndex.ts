import type { Shortcut } from '@/types';
import { resolveLeadingAlphabetIndex } from '@/utils/textInitials';

export const DRAWER_SHORTCUT_ALPHABET_INDEX = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')] as const;

const NON_LETTER_INDEX = '#';
const COMBINING_MARKS_PATTERN = /[\u0300-\u036f]/g;

function normalizeShortcutIndexSource(value: string): string {
  if (!value) return '';
  return value
    .normalize('NFKD')
    .replace(COMBINING_MARKS_PATTERN, '')
    .trim()
    .toUpperCase();
}

function resolveShortcutIndexSource(shortcut: Shortcut): string {
  const title = (shortcut.title || '').trim();
  if (title) return title;

  const url = (shortcut.url || '').trim();
  if (url) {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./i, '').trim();
      if (hostname) return hostname;
    } catch {
      return url;
    }
  }

  return (shortcut.kind || '').trim();
}

export function resolveShortcutIndexLetter(shortcut: Shortcut): string {
  const normalizedSource = normalizeShortcutIndexSource(resolveShortcutIndexSource(shortcut));
  return resolveLeadingAlphabetIndex(normalizedSource) ?? NON_LETTER_INDEX;
}

export function collectAvailableShortcutIndexLetters(shortcuts: Shortcut[]): string[] {
  if (shortcuts.length === 0) return [];

  const availableLetters = new Set<string>();

  shortcuts.forEach((shortcut) => {
    availableLetters.add(resolveShortcutIndexLetter(shortcut));
  });

  return DRAWER_SHORTCUT_ALPHABET_INDEX.filter((letter) => availableLetters.has(letter));
}

export function filterShortcutsByIndexLetter(
  shortcuts: Shortcut[],
  letter: string | null,
): Shortcut[] {
  if (!letter) return shortcuts;
  return shortcuts.filter((shortcut) => resolveShortcutIndexLetter(shortcut) === letter);
}
