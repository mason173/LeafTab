import type { SearchEngine } from '@/types';

import googleIcon from '@/assets/google.svg';
import bingIcon from '@/assets/bing.svg';
import baiduIcon from '@/assets/baidu.svg';
import duckduckgoIcon from '@/assets/duckduckgo.svg';
import searchIcon from '@/assets/searchicon.svg';

export const SEARCH_ENGINE_SWITCHER_INTERACT_EVENT = 'leaftab-search-engine-switcher-interact';

export type SearchEngineSwitcherProps = {
  engine: SearchEngine;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (engine: SearchEngine) => void;
  surfaceTone?: 'default' | 'drawer';
  toneClassName?: string;
  surfaceClassName?: string;
  itemClassName?: string;
  itemSelectedClassName?: string;
};

export type SearchEngineOption = {
  id: SearchEngine;
  name: string;
  icon: string;
};

export const SEARCH_ENGINE_BRAND_NAMES: Record<Exclude<SearchEngine, 'system'>, string> = {
  google: 'Google',
  bing: 'Bing',
  duckduckgo: 'DuckDuckGo',
  baidu: 'Baidu',
};

export function getEngineIcon(engine: SearchEngine) {
  switch (engine) {
    case 'system':
      return searchIcon;
    case 'google':
      return googleIcon;
    case 'bing':
      return bingIcon;
    case 'baidu':
      return baiduIcon;
    case 'duckduckgo':
      return duckduckgoIcon;
  }
}
