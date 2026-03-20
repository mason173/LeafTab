import { useTranslation } from 'react-i18next';
import { RiArrowRightSLine, RiCheckFill } from '@/icons/ri-compat';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAvailableSearchEngineOrder } from '@/platform/search';
import {
  getEngineIcon,
  SEARCH_ENGINE_BRAND_NAMES,
  type SearchEngineOption,
  type SearchEngineSwitcherProps,
} from '@/components/search/searchEngineSwitcher.shared';

import searchIcon from '@/assets/searchicon.svg';

export function SearchEngineSwitcher({
  engine,
  onOpenChange,
  onSelect,
  isOpen,
  toneClassName,
  surfaceClassName,
  itemClassName,
  itemSelectedClassName,
}: SearchEngineSwitcherProps) {
  const { t } = useTranslation();

  const engineOptionMap: Record<typeof engine, SearchEngineOption> = {
    system: { id: 'system', name: t('search.systemEngine'), icon: searchIcon },
    bing: { id: 'bing', name: SEARCH_ENGINE_BRAND_NAMES.bing, icon: getEngineIcon('bing') },
    google: { id: 'google', name: SEARCH_ENGINE_BRAND_NAMES.google, icon: getEngineIcon('google') },
    duckduckgo: { id: 'duckduckgo', name: SEARCH_ENGINE_BRAND_NAMES.duckduckgo, icon: getEngineIcon('duckduckgo') },
    baidu: { id: 'baidu', name: SEARCH_ENGINE_BRAND_NAMES.baidu, icon: getEngineIcon('baidu') },
  };
  const engines = getAvailableSearchEngineOrder().map((item) => engineOptionMap[item]);

  return (
    <DropdownMenu modal={false} open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
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
