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
  const [activeLetter, setActiveLetter] = useState<string>('#');
  const availableLetters = useMemo(
    () => collectAvailableShortcutIndexLetters(shortcuts),
    [shortcuts],
  );

  const handleLetterSelect = useCallback((letter: string) => {
    setActiveLetter(letter);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setActiveLetter('#');
      return;
    }

    if (availableLetters.length === 0) {
      setActiveLetter('#');
      return;
    }

    if (!availableLetters.includes(activeLetter)) {
      setActiveLetter('#');
    }
  }, [activeLetter, availableLetters, enabled]);

  return {
    activeLetter,
    availableLetters,
    showAlphabetRail: enabled && availableLetters.length > 1,
    onLetterSelect: handleLetterSelect,
  };
}
