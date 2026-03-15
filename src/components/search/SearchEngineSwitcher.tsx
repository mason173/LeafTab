import { useTranslation } from 'react-i18next';
import { RiArrowRightSLine, RiCheckFill } from '@remixicon/react';
import type { SearchEngine } from '@/types';
import { SEARCH_ENGINE_ORDER } from '@/utils/searchHelpers';

import googleIcon from '@/assets/google.svg';
import bingIcon from '@/assets/bing.svg';
import baiduIcon from '@/assets/baidu.svg';
import duckduckgoIcon from '@/assets/duckduckgo.svg';
import searchIcon from '@/assets/searchicon.svg';

type SearchEngineOption = {
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

export const getEngineIcon = (engine: SearchEngine) => {
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
};

export function SearchEngineSwitcherTrigger({
  engine,
  onClick,
  blankMode,
  forceWhiteTheme,
  subtleDarkTone,
}: {
  engine: SearchEngine;
  onClick?: () => void;
  blankMode?: boolean;
  forceWhiteTheme?: boolean;
  subtleDarkTone?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className={`mr-1 flex items-center gap-1.5 rounded-[10px] px-1.5 py-1 shrink-0 cursor-pointer ${
        subtleDarkTone
          ? 'text-black/35'
          : (forceWhiteTheme
            ? 'text-black/55'
            : (blankMode
              ? 'text-white/60'
              : 'text-foreground/70'))
      }`}
    >
      <img alt="" className="size-[18px] object-contain pointer-events-none shrink-0" src={getEngineIcon(engine)} />
      <RiArrowRightSLine className="size-3.5 opacity-70" />
    </button>
  );
}

export function SearchEngineSwitcherDropdown({
  currentEngine,
  onSelect,
  isOpen,
}: {
  currentEngine: SearchEngine;
  onSelect: (engine: SearchEngine) => void;
  isOpen: boolean;
}) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const engineOptionMap: Record<SearchEngine, SearchEngineOption> = {
    system: { id: 'system', name: t('search.systemEngine'), icon: searchIcon },
    bing: { id: 'bing', name: SEARCH_ENGINE_BRAND_NAMES.bing, icon: bingIcon },
    google: { id: 'google', name: SEARCH_ENGINE_BRAND_NAMES.google, icon: googleIcon },
    duckduckgo: { id: 'duckduckgo', name: SEARCH_ENGINE_BRAND_NAMES.duckduckgo, icon: duckduckgoIcon },
    baidu: { id: 'baidu', name: SEARCH_ENGINE_BRAND_NAMES.baidu, icon: baiduIcon },
  };
  const engines = SEARCH_ENGINE_ORDER.map((engine) => engineOptionMap[engine]);

  return (
    <div className="absolute left-0 top-[calc(100%+8px)] z-[520] w-[232px] max-h-[300px] overflow-y-auto rounded-[16px] border border-border bg-popover p-1.5 text-popover-foreground shadow-lg" data-name="DropDown">
      {engines.map((engine) => (
        <button
          type="button"
          key={engine.id}
          className={`flex w-full items-center gap-2 rounded-[14px] px-2 py-1.5 text-sm transition-colors ${
            currentEngine === engine.id
              ? 'bg-accent text-accent-foreground'
              : 'text-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
          onClick={() => onSelect(engine.id)}
        >
          <img alt="" className="size-5 shrink-0 object-contain pointer-events-none" src={engine.icon} />
          <span className="truncate text-sm leading-none">{engine.name}</span>
          <RiCheckFill className={`ml-auto size-4 ${currentEngine === engine.id ? 'opacity-100 text-primary' : 'opacity-0'}`} />
        </button>
      ))}
    </div>
  );
}
