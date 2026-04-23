import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiCheckFill } from '@/icons/ri-compat';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SearchFakeBlurSurface } from '@/components/search/SearchFakeBlurSurface';
import { getAvailableSearchEngineOrder } from '@/platform/search';
import {
  getEngineIcon,
  SEARCH_ENGINE_BRAND_NAMES,
  SEARCH_ENGINE_SWITCHER_INTERACT_EVENT,
  type SearchEngineOption,
  type SearchEngineSwitcherProps,
} from '@/components/search/searchEngineSwitcher.shared';

import searchIcon from '@/assets/searchicon.svg';

const CHROMIUM_DROPDOWN_DISMISS_GUARD_MS = 220;

export function SearchEngineSwitcher({
  engine,
  onOpenChange,
  onSelect,
  isOpen,
  disabled = false,
  toneClassName,
  surfaceClassName,
  itemClassName,
  itemSelectedClassName,
  surfaceTone = 'default',
}: SearchEngineSwitcherProps) {
  const { t } = useTranslation();
  const dismissGuardUntilRef = useRef(0);
  const [surfaceNode, setSurfaceNode] = useState<HTMLDivElement | null>(null);

  const engineOptionMap: Record<typeof engine, SearchEngineOption> = {
    system: { id: 'system', name: t('search.systemEngine'), icon: searchIcon },
    bing: { id: 'bing', name: SEARCH_ENGINE_BRAND_NAMES.bing, icon: getEngineIcon('bing') },
    google: { id: 'google', name: SEARCH_ENGINE_BRAND_NAMES.google, icon: getEngineIcon('google') },
    duckduckgo: { id: 'duckduckgo', name: SEARCH_ENGINE_BRAND_NAMES.duckduckgo, icon: getEngineIcon('duckduckgo') },
    baidu: { id: 'baidu', name: SEARCH_ENGINE_BRAND_NAMES.baidu, icon: getEngineIcon('baidu') },
  };
  const engines = getAvailableSearchEngineOrder().map((item) => engineOptionMap[item]);
  const markSwitcherInteraction = () => {
    window.dispatchEvent(new CustomEvent(SEARCH_ENGINE_SWITCHER_INTERACT_EVENT));
  };
  const activateDismissGuard = () => {
    dismissGuardUntilRef.current = Date.now() + CHROMIUM_DROPDOWN_DISMISS_GUARD_MS;
  };

  return (
    <DropdownMenu
      modal={false}
      open={isOpen}
      onOpenChange={(open) => {
        if (disabled) return;
        if (open) {
          markSwitcherInteraction();
          activateDismissGuard();
        }
        onOpenChange(open);
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          tabIndex={disabled ? -1 : undefined}
          aria-disabled={disabled}
          data-search-engine-switcher-trigger="true"
          onMouseDown={(event) => {
            if (disabled) return;
            markSwitcherInteraction();
            activateDismissGuard();
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerDown={(event) => {
            if (disabled) return;
            markSwitcherInteraction();
            activateDismissGuard();
            event.stopPropagation();
          }}
          onClick={(event) => event.stopPropagation()}
          className={`relative z-[1] mr-1 flex shrink-0 items-center rounded-[12px] px-2 py-1.5 ${disabled ? 'cursor-default opacity-60' : 'cursor-pointer'} ${toneClassName || 'text-black/50 dark:text-white/72'}`}
        >
          <span className="relative flex size-5 shrink-0 items-center justify-center">
            <img alt="" className="pointer-events-none size-5 shrink-0 object-contain" src={getEngineIcon(engine)} />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={10}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
        onFocusOutside={(event) => {
          if (Date.now() < dismissGuardUntilRef.current) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (Date.now() < dismissGuardUntilRef.current) {
            event.preventDefault();
          }
        }}
        ref={setSurfaceNode}
        className={`z-[520] isolate w-[260px] max-h-[320px] overflow-y-auto rounded-[18px] p-2 !border-transparent !bg-transparent !shadow-none !backdrop-blur-none ${surfaceClassName || 'text-black/72 dark:text-white/92'}`}
      >
        <SearchFakeBlurSurface
          surfaceNode={surfaceNode}
          tone={surfaceTone}
          radiusClassName="rounded-[18px]"
        />
        <div className="relative z-[1]">
          {engines.map((option) => (
            <DropdownMenuItem
              key={option.id}
              className={`gap-2.5 rounded-[16px] px-3 py-2 text-sm ${
                engine === option.id
                  ? (itemSelectedClassName || 'bg-black/8 text-black/86 dark:bg-white/12 dark:text-white/[0.96]')
                  : (itemClassName || 'text-black/76 hover:bg-black/5 hover:text-black/88 dark:text-white/88 dark:hover:bg-white/10 dark:hover:text-white/[0.96]')
              }`}
              onSelect={() => onSelect(option.id)}
            >
              <img alt="" className="pointer-events-none size-[22px] shrink-0 object-contain" src={option.icon} />
              <span className="truncate text-sm leading-5">{option.name}</span>
              <RiCheckFill className={`ml-auto size-[18px] ${engine === option.id ? 'opacity-100 text-current' : 'opacity-0'}`} />
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
