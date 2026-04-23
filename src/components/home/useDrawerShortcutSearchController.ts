import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { RootShortcutGridProps } from '@/features/shortcuts/components/RootShortcutGrid';
import type { Shortcut } from '@/types';
import { useDrawerShortcutAlphabetIndex } from '@/components/home/useDrawerShortcutAlphabetIndex';
import {
  buildDrawerShortcutEntries,
  collectDrawerShortcutIndexTargets,
  filterDrawerShortcutEntriesByIndexLetter,
} from '@/components/home/drawerShortcutFiltering';
import { isShortcutFolder } from '@/utils/shortcutFolders';

type UseDrawerShortcutSearchControllerParams = {
  enabled: boolean;
  interactionDisabled?: boolean;
  shortcutGridProps: RootShortcutGridProps;
  onFolderChildShortcutContextMenu?: (
    event: ReactMouseEvent<HTMLDivElement>,
    folderId: string,
    shortcut: Shortcut,
  ) => void;
};

export function useDrawerShortcutSearchController({
  enabled,
  interactionDisabled = false,
  shortcutGridProps,
  onFolderChildShortcutContextMenu,
}: UseDrawerShortcutSearchControllerParams) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState('');
  const deferredShortcutSearchValue = useDeferredValue(searchValue);
  const normalizedShortcutSearchQuery = deferredShortcutSearchValue.trim().toLocaleLowerCase();
  const searchingShortcuts = normalizedShortcutSearchQuery.length > 0;

  const searchedShortcutEntries = useMemo(() => {
    const entries = buildDrawerShortcutEntries(shortcutGridProps.shortcuts);
    if (!searchingShortcuts) return entries;

    return entries.filter(({ shortcut }) => {
      const title = (shortcut.title || '').trim().toLocaleLowerCase();
      const url = (shortcut.url || '').trim().toLocaleLowerCase();
      const kind = (shortcut.kind || '').trim().toLocaleLowerCase();
      const folderKeywords = isShortcutFolder(shortcut) ? ' folder 文件夹' : '';
      const haystack = `${title}\n${url}\n${kind}${folderKeywords}`;
      return haystack.includes(normalizedShortcutSearchQuery);
    });
  }, [normalizedShortcutSearchQuery, searchingShortcuts, shortcutGridProps.shortcuts]);

  const searchedShortcuts = useMemo(
    () => collectDrawerShortcutIndexTargets(searchedShortcutEntries),
    [searchedShortcutEntries],
  );

  const {
    activeLetter,
    availableLetters,
    showAlphabetRail,
    onLetterSelect,
    clearActiveLetter,
  } = useDrawerShortcutAlphabetIndex({
    enabled: enabled && !interactionDisabled,
    shortcuts: searchedShortcuts,
  });

  const filteringByLetter = activeLetter !== null;
  const filteredShortcutEntries = useMemo(
    () => filterDrawerShortcutEntriesByIndexLetter(searchedShortcutEntries, activeLetter),
    [activeLetter, searchedShortcutEntries],
  );
  const filteredShortcuts = useMemo(
    () => filteredShortcutEntries.map((entry) => entry.shortcut),
    [filteredShortcutEntries],
  );
  const showShortcutSearchEmptyState = (searchingShortcuts || filteringByLetter) && filteredShortcuts.length === 0;

  const handleFilteredShortcutContextMenu = useCallback((
    event: ReactMouseEvent<HTMLDivElement>,
    shortcutIndex: number,
    shortcut: Shortcut,
  ) => {
    const entry = filteredShortcutEntries[shortcutIndex];
    if (!entry) return;

    if (entry.parentFolderId) {
      if (onFolderChildShortcutContextMenu) {
        onFolderChildShortcutContextMenu(event, entry.parentFolderId, shortcut);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    shortcutGridProps.onShortcutContextMenu(event, entry.rootIndex, shortcut);
  }, [filteredShortcutEntries, onFolderChildShortcutContextMenu, shortcutGridProps]);

  const filteredShortcutGridProps = useMemo(() => (
    (searchingShortcuts || filteringByLetter)
      ? {
          ...shortcutGridProps,
          shortcuts: filteredShortcuts,
          disableReorderAnimation: true,
          onShortcutContextMenu: handleFilteredShortcutContextMenu,
          onShortcutReorder: () => {},
          onShortcutDropIntent: undefined,
          onGridContextMenu: () => {},
          onDragStart: undefined,
          onDragEnd: undefined,
          selectionMode: false,
          selectedShortcutIndexes: undefined,
          onToggleShortcutSelection: undefined,
          externalDragSession: null,
          onExternalDragSessionConsumed: undefined,
        }
      : shortcutGridProps
  ), [
    filteredShortcuts,
    filteringByLetter,
    handleFilteredShortcutContextMenu,
    searchingShortcuts,
    shortcutGridProps,
  ]);

  const handleBlankAreaExitLetterFilter = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!filteringByLetter) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (
      target.closest([
        '[data-shortcut-id]',
        '[data-shortcut-index-letter]',
        'input',
        'textarea',
        'button',
        'a',
        '[role="button"]',
      ].join(','))
    ) {
      return;
    }
    clearActiveLetter();
  }, [clearActiveLetter, filteringByLetter]);

  useEffect(() => {
    if (enabled) return;
    setSearchValue('');
    inputRef.current?.blur();
  }, [enabled]);

  useEffect(() => {
    if (!interactionDisabled) return;
    inputRef.current?.blur();
  }, [interactionDisabled]);

  return {
    inputRef,
    searchValue,
    setSearchValue,
    normalizedShortcutSearchQuery,
    activeIndexLetter: activeLetter,
    availableLetters,
    showAlphabetRail,
    onLetterSelect,
    clearActiveLetter,
    filteredShortcutGridProps,
    showShortcutSearchEmptyState,
    handleBlankAreaExitLetterFilter,
  };
}
