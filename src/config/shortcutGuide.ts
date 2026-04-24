export type ShortcutGuideSectionId = 'search' | 'results';

export type ShortcutGuideItemId =
  | 'focusSearch'
  | 'switchEngine'
  | 'temporaryEnginePrefix'
  | 'switchScenarioNext'
  | 'bookmarksMode'
  | 'tabsMode'
  | 'navigateResults'
  | 'openResult'
  | 'closePanel'
  | 'showNumberHints'
  | 'openNumberedResult';

export type ShortcutGuideEntry = {
  id: ShortcutGuideItemId;
  combos: readonly (readonly string[])[];
};

export type ShortcutGuideSection = {
  id: ShortcutGuideSectionId;
  items: readonly ShortcutGuideEntry[];
};

export const SHORTCUT_GUIDE_SECTIONS: readonly ShortcutGuideSection[] = [
  {
    id: 'search',
    items: [
      { id: 'focusSearch', combos: [['Cmd / Ctrl', 'K']] },
      { id: 'switchEngine', combos: [['Tab'], ['Shift', 'Tab']] },
      { id: 'temporaryEnginePrefix', combos: [['!g 关键词'], ['!b 关键词'], ['!d 关键词'], ['!bd 关键词']] },
      { id: 'switchScenarioNext', combos: [['Cmd / Ctrl', 'Alt', 'S']] },
      { id: 'bookmarksMode', combos: [['/b'], ['/bookmarks']] },
      { id: 'tabsMode', combos: [['/t'], ['/tabs']] },
    ],
  },
  {
    id: 'results',
    items: [
      { id: 'navigateResults', combos: [['Up'], ['Down']] },
      { id: 'openResult', combos: [['Enter']] },
      { id: 'closePanel', combos: [['Esc']] },
      { id: 'showNumberHints', combos: [['Cmd / Ctrl']] },
      { id: 'openNumberedResult', combos: [['Cmd / Ctrl', '数字键']] },
    ],
  },
] as const;
