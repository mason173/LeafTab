import { useMemo, useState, type RefObject } from 'react';
import { useTheme } from 'next-themes';
import { RiCloseLine, RiSearchLine } from '@/icons/ri-compat';
import { SearchFakeBlurSurface } from '@/components/search/SearchFakeBlurSurface';

type DrawerShortcutSearchBarProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  widthPercent?: number;
  height: number;
};

export function DrawerShortcutSearchBar({
  inputRef,
  value,
  onValueChange,
  className,
  widthPercent = 70,
  height,
}: DrawerShortcutSearchBarProps) {
  const { resolvedTheme } = useTheme();
  const [surfaceNode, setSurfaceNode] = useState<HTMLDivElement | null>(null);
  const trimmedWidthPercent = Math.max(40, Math.min(100, widthPercent));
  const isDarkTheme = resolvedTheme === 'dark';

  const inputClassName = useMemo(() => (
    isDarkTheme
      ? 'text-white/92 placeholder:text-white/42'
      : 'text-black/78 placeholder:text-black/36'
  ), [isDarkTheme]);

  const iconClassName = useMemo(() => (
    isDarkTheme ? 'text-white/56' : 'text-black/42'
  ), [isDarkTheme]);

  return (
    <div className={className}>
      <div className="flex w-full justify-center">
        <div
          ref={setSurfaceNode}
          className="relative w-full max-w-full overflow-hidden rounded-[999px]"
          style={{
            width: `${trimmedWidthPercent}%`,
            height,
          }}
          onClick={() => {
            inputRef.current?.focus();
          }}
        >
          <SearchFakeBlurSurface
            surfaceNode={surfaceNode}
            modeOverlayOpacity={0.75}
            showBorder={false}
          />
          <div
            className="relative z-10 flex h-full items-center gap-3 px-5"
          >
            <RiSearchLine className={`size-4 shrink-0 ${iconClassName}`} />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(event) => {
                onValueChange(event.target.value);
              }}
              placeholder="搜索快捷方式"
              aria-label="搜索快捷方式"
              className={`h-full w-full border-none bg-transparent text-[15px] outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${inputClassName}`}
            />
            {value.trim().length > 0 ? (
              <button
                type="button"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${iconClassName} hover:bg-black/8 dark:hover:bg-white/10`}
                aria-label="清空快捷方式搜索"
                onClick={() => {
                  onValueChange('');
                  inputRef.current?.focus();
                }}
              >
                <RiCloseLine className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
