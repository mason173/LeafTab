import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Shortcut } from '@/types';
import {
  collectAvailableShortcutIndexLetters,
} from '@/components/home/drawerShortcutAlphabetIndex';

type UseDrawerShortcutAlphabetIndexParams = {
  enabled: boolean;
  shortcuts: Shortcut[];
};

export function useDrawerShortcutAlphabetIndex({
  enabled,
  shortcuts,
}: UseDrawerShortcutAlphabetIndexParams) {
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const availableLetters = useMemo(
    () => collectAvailableShortcutIndexLetters(shortcuts),
    [shortcuts],
  );

  const handleLetterSelect = useCallback((letter: string) => {
    setActiveLetter(letter);
  }, []);

  const clearActiveLetter = useCallback(() => {
    setActiveLetter(null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setActiveLetter(null);
      return;
    }

    if (availableLetters.length === 0) {
      setActiveLetter(null);
      return;
    }

    if (activeLetter && !availableLetters.includes(activeLetter)) {
      setActiveLetter(null);
    }
  }, [activeLetter, availableLetters, enabled]);

  return {
    activeLetter,
    availableLetters,
    showAlphabetRail: enabled && availableLetters.length > 0,
    onLetterSelect: handleLetterSelect,
    clearActiveLetter,
  };
}
