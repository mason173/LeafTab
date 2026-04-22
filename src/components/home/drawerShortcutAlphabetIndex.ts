import type { Shortcut } from '@/types';

export const DRAWER_SHORTCUT_ALPHABET_INDEX = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')] as const;

const NON_LETTER_INDEX = '#';
const LETTER_PATTERN = /^[A-Z]$/;
const ASCII_DIGIT_PATTERN = /^[0-9]$/;
const COMBINING_MARKS_PATTERN = /[\u0300-\u036f]/g;
const WORD_OR_NUMBER_PATTERN = /[\p{L}\p{N}]/u;

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

  for (const character of normalizedSource) {
    if (LETTER_PATTERN.test(character)) return character;
    if (ASCII_DIGIT_PATTERN.test(character)) return NON_LETTER_INDEX;
    if (WORD_OR_NUMBER_PATTERN.test(character)) return NON_LETTER_INDEX;
  }

  return NON_LETTER_INDEX;
}

export function collectAvailableShortcutIndexLetters(shortcuts: Shortcut[]): string[] {
  if (shortcuts.length === 0) return [];

  const availableLetters = new Set<string>();

  shortcuts.forEach((shortcut) => {
    const indexLetter = resolveShortcutIndexLetter(shortcut);
    if (indexLetter !== NON_LETTER_INDEX) {
      availableLetters.add(indexLetter);
    }
  });

  return [
    NON_LETTER_INDEX,
    ...DRAWER_SHORTCUT_ALPHABET_INDEX.filter((letter) => letter !== NON_LETTER_INDEX && availableLetters.has(letter)),
  ];
}

export function filterShortcutsByIndexLetter(
  shortcuts: Shortcut[],
  letter: string | null,
): Shortcut[] {
  if (!letter || letter === NON_LETTER_INDEX) return shortcuts;
  return shortcuts.filter((shortcut) => resolveShortcutIndexLetter(shortcut) === letter);
}
