import { useTranslation } from 'react-i18next';
import { RiArrowRightSLine, RiCheckFill } from '@/icons/ri-compat';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export function SearchEngineSwitcher({
  engine,
  onOpenChange,
  onSelect,
  isOpen,
  toneClassName,
  surfaceClassName,
  itemClassName,
  itemSelectedClassName,
}: {
  engine: SearchEngine;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (engine: SearchEngine) => void;
  toneClassName?: string;
  surfaceClassName?: string;
  itemClassName?: string;
  itemSelectedClassName?: string;
}) {
  const { t } = useTranslation();

  const engineOptionMap: Record<SearchEngine, SearchEngineOption> = {
    system: { id: 'system', name: t('search.systemEngine'), icon: searchIcon },
    bing: { id: 'bing', name: SEARCH_ENGINE_BRAND_NAMES.bing, icon: bingIcon },
    google: { id: 'google', name: SEARCH_ENGINE_BRAND_NAMES.google, icon: googleIcon },
    duckduckgo: { id: 'duckduckgo', name: SEARCH_ENGINE_BRAND_NAMES.duckduckgo, icon: duckduckgoIcon },
    baidu: { id: 'baidu', name: SEARCH_ENGINE_BRAND_NAMES.baidu, icon: baiduIcon },
  };
  const engines = SEARCH_ENGINE_ORDER.map((engine) => engineOptionMap[engine]);

  return (
    <DropdownMenu modal={false} open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          className={`mr-1 flex shrink-0 cursor-pointer items-center gap-2 rounded-[12px] px-2 py-1.5 ${toneClassName || 'text-foreground/70'}`}
        >
          <img alt="" className="pointer-events-none size-5 shrink-0 object-contain" src={getEngineIcon(engine)} />
          <RiArrowRightSLine className="size-4 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={10}
        className={`z-[520] w-[260px] max-h-[320px] overflow-y-auto rounded-[18px] border p-2 ${surfaceClassName || 'border-border bg-popover text-popover-foreground shadow-lg'}`}
      >
        {engines.map((option) => (
          <DropdownMenuItem
            key={option.id}
            className={`gap-2.5 rounded-[16px] px-3 py-2 text-sm ${
              engine === option.id
                ? (itemSelectedClassName || 'bg-accent text-accent-foreground')
                : (itemClassName || 'text-foreground hover:bg-accent hover:text-accent-foreground')
            }`}
            onSelect={() => onSelect(option.id)}
          >
            <img alt="" className="pointer-events-none size-[22px] shrink-0 object-contain" src={option.icon} />
            <span className="truncate text-sm leading-5">{option.name}</span>
            <RiCheckFill className={`ml-auto size-[18px] ${engine === option.id ? 'opacity-100 text-primary' : 'opacity-0'}`} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
