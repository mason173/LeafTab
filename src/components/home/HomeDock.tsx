import { useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { Dock, DockIcon, DockItem, DockLabel } from '@/components/motion-primitives/dock';
import WallpaperSelector from '@/components/WallpaperSelector';
import type { DisplayMode } from '@/displayMode/config';
import settingIcon from '@/assets/setting.svg';
import wallpaperIcon from '@/assets/Wallpaper.svg';
import lightModeIcon from '@/assets/lightmodel.svg';
import darkModeIcon from '@/assets/darkmodel.svg';
import layoutFlashIcon from '@/assets/layoutflash.svg';
import layoutFullIcon from '@/assets/layoutfull.svg';
import layoutMiniIcon from '@/assets/layoutmini.svg';
import searchIcon from '@/assets/searchicon.svg';

interface HomeDockProps {
  onSettingsOpen: () => void;
  onQuickAccessOpen?: () => void;
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  wallpaperSelectorProps: React.ComponentProps<typeof WallpaperSelector>;
  hidden?: boolean;
}

const DISPLAY_MODE_ORDER: DisplayMode[] = ['panoramic', 'fresh', 'minimalist'];

export function HomeDock({
  onSettingsOpen,
  onQuickAccessOpen,
  displayMode,
  onDisplayModeChange,
  wallpaperSelectorProps,
  hidden = false,
}: HomeDockProps) {
  const { t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const [wallpaperOpen, setWallpaperOpen] = useState(false);

  const nextDisplayMode = useMemo(() => {
    const currentIndex = DISPLAY_MODE_ORDER.indexOf(displayMode);
    return DISPLAY_MODE_ORDER[(currentIndex + 1) % DISPLAY_MODE_ORDER.length];
  }, [displayMode]);

  const themeLabel = resolvedTheme === 'dark'
    ? t('settings.theme.light')
    : t('settings.theme.dark');

  const cycleDisplayMode = () => {
    onDisplayModeChange(nextDisplayMode);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const itemClassName = 'aspect-square cursor-pointer rounded-full bg-gray-200/0 dark:bg-neutral-800/0';
  const iconImageClassName = 'h-full w-full select-none object-contain opacity-90';
  const themeIconSrc = resolvedTheme === 'dark' ? lightModeIcon : darkModeIcon;
  const layoutIconSrc = displayMode === 'fresh'
    ? layoutFlashIcon
    : displayMode === 'minimalist'
      ? layoutMiniIcon
      : layoutFullIcon;

  return (
    <div
      className={`pointer-events-none fixed bottom-2 left-1/2 z-[70] max-w-full -translate-x-1/2 transition-opacity duration-200 ${hidden ? 'opacity-0' : 'opacity-100'}`}
      aria-hidden={hidden}
    >
      <Dock className={`items-end pb-2 ${hidden ? 'pointer-events-none' : 'pointer-events-auto'}`} disabled={wallpaperOpen || hidden}>
        {onQuickAccessOpen && (
          <DockItem onClick={onQuickAccessOpen} className={itemClassName}>
            <DockLabel>{t('search.placeholderDynamic', { defaultValue: 'Search' })}</DockLabel>
            <DockIcon>
              <img src={searchIcon} alt="" className={iconImageClassName} draggable={false} />
            </DockIcon>
          </DockItem>
        )}

        <DockItem onClick={onSettingsOpen} className={itemClassName}>
          <DockLabel>{t('settings.title')}</DockLabel>
          <DockIcon>
            <img src={settingIcon} alt="" className={iconImageClassName} draggable={false} />
          </DockIcon>
        </DockItem>

        <WallpaperSelector
          {...wallpaperSelectorProps}
          open={wallpaperOpen}
          onOpenChange={setWallpaperOpen}
          trigger={(
            <DockItem className={itemClassName}>
              <DockLabel>{t('weather.wallpaper.mode')}</DockLabel>
              <DockIcon>
                <img src={wallpaperIcon} alt="" className={iconImageClassName} draggable={false} />
              </DockIcon>
            </DockItem>
          )}
        />

        <DockItem onClick={toggleTheme} className={itemClassName}>
          <DockLabel>{themeLabel}</DockLabel>
          <DockIcon>
            <img src={themeIconSrc} alt="" className={iconImageClassName} draggable={false} />
          </DockIcon>
        </DockItem>

        <DockItem onClick={cycleDisplayMode} className={itemClassName}>
          <DockLabel>{t('settings.displayMode.title', { defaultValue: '布局模式' })}</DockLabel>
          <DockIcon>
            <img src={layoutIconSrc} alt="" className={iconImageClassName} draggable={false} />
          </DockIcon>
        </DockItem>
      </Dock>
    </div>
  );
}
