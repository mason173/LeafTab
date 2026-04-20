import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiAddLine, RiCheckFill, RiSubtractLine } from '@/icons/ri-compat';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch, SwitchThumb } from '@/components/animate-ui/primitives/radix/switch';
import { Separator } from '@/components/ui/separator';
import { BackToSettingsButton } from '@/components/BackToSettingsButton';
import ShortcutIcon from '@/components/ShortcutIcon';
import Scrubber from '@/components/ui/smoothui/scrubber';
import aboutIcon from '@/assets/abouticon.svg';
import type { ShortcutIconAppearance } from '@/types';
import {
  clampShortcutGridColumns,
  getShortcutColumnBounds,
} from '@/components/shortcuts/shortcutCardVariant';
import {
  clampShortcutIconCornerRadius,
  clampShortcutIconScale,
  DEFAULT_SHORTCUT_ICON_SCALE,
  MAX_SHORTCUT_ICON_SCALE,
  MAX_SHORTCUT_ICON_CORNER_RADIUS,
  MIN_SHORTCUT_ICON_SCALE,
  MIN_SHORTCUT_ICON_CORNER_RADIUS,
  scaleShortcutIconSize,
} from '@/utils/shortcutIconSettings';

interface ShortcutIconSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackToSettings?: () => void;
  compactShowTitle: boolean;
  columns: number;
  onSaveStyle: (payload: { compactShowTitle: boolean; columns: number }) => void;
  appearance: ShortcutIconAppearance;
  cornerRadius: number;
  scale: number;
  onSave: (payload: { appearance: ShortcutIconAppearance; cornerRadius: number; scale: number }) => void;
}

function AppearanceCard({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onClick}
      className={`flex min-h-[52px] flex-1 items-center justify-between rounded-[16px] border px-3.5 py-2 transition-colors ${
        selected
          ? 'border-primary bg-primary/12 text-primary'
          : 'border-border bg-secondary/20 text-muted-foreground hover:bg-secondary/35 hover:text-foreground'
      }`}
    >
      <span className="truncate text-left text-[15px] font-medium leading-none">{label}</span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background/40'
        }`}
      >
        {selected ? <RiCheckFill className="size-3" /> : null}
      </span>
    </button>
  );
}

export function ShortcutIconSettingsDialog({
  open,
  onOpenChange,
  onBackToSettings,
  compactShowTitle,
  columns,
  onSaveStyle,
  appearance,
  cornerRadius,
  scale,
  onSave,
}: ShortcutIconSettingsDialogProps) {
  const { t } = useTranslation();
  const [draftColumns, setDraftColumns] = useState(() => clampShortcutGridColumns(columns));
  const [draftCompactShowTitle, setDraftCompactShowTitle] = useState(compactShowTitle);
  const [draftAppearance, setDraftAppearance] = useState<ShortcutIconAppearance>(appearance);
  const [draftCornerRadius, setDraftCornerRadius] = useState(cornerRadius);
  const [draftScale, setDraftScale] = useState(scale);
  const [isSliderInteracting, setIsSliderInteracting] = useState(false);
  const [activeSlider, setActiveSlider] = useState<'columns' | 'cornerRadius' | 'size' | null>(null);
  const isolationFadeClass = 'transition-opacity duration-220 ease-out';
  const previewStageSize = 124;
  const previewIconSize = scaleShortcutIconSize(92, draftScale);
  const columnBounds = useMemo(() => getShortcutColumnBounds(), []);

  useEffect(() => {
    if (!open) {
      setIsSliderInteracting(false);
      setActiveSlider(null);
      return;
    }
    setDraftColumns(clampShortcutGridColumns(columns));
    setDraftCompactShowTitle(compactShowTitle);
    setDraftAppearance(appearance);
    setDraftCornerRadius(clampShortcutIconCornerRadius(cornerRadius));
    setDraftScale(clampShortcutIconScale(scale));
  }, [appearance, columns, compactShowTitle, cornerRadius, open, scale]);

  const emitLiveStyleUpdate = (nextCompactShowTitle: boolean, nextColumns: number) => {
    onSaveStyle({
      compactShowTitle: nextCompactShowTitle,
      columns: nextColumns,
    });
  };

  const handleCompactShowTitleChange = (nextCompactShowTitle: boolean) => {
    setDraftCompactShowTitle(nextCompactShowTitle);
    emitLiveStyleUpdate(nextCompactShowTitle, draftColumns);
  };

  const handleColumnsChange = (nextRawValue: number) => {
    const nextColumns = clampShortcutGridColumns(Math.round(nextRawValue));
    setDraftColumns(nextColumns);
    emitLiveStyleUpdate(draftCompactShowTitle, nextColumns);
  };

  const emitLiveIconUpdate = (nextAppearance: ShortcutIconAppearance, nextCornerRadius: number, nextScale: number) => {
    onSave({
      appearance: nextAppearance,
      cornerRadius: clampShortcutIconCornerRadius(nextCornerRadius),
      scale: clampShortcutIconScale(nextScale),
    });
  };

  const handleAppearanceChange = (nextAppearance: ShortcutIconAppearance) => {
    setDraftAppearance(nextAppearance);
    emitLiveIconUpdate(nextAppearance, draftCornerRadius, draftScale);
  };

  const handleCornerRadiusChange = (nextCornerRadius: number) => {
    const normalized = clampShortcutIconCornerRadius(nextCornerRadius);
    setDraftCornerRadius(normalized);
    emitLiveIconUpdate(draftAppearance, normalized, draftScale);
  };

  const handleScaleChange = (nextScale: number) => {
    const normalized = clampShortcutIconScale(nextScale);
    setDraftScale(normalized);
    emitLiveIconUpdate(draftAppearance, draftCornerRadius, normalized);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsSliderInteracting(false);
      setActiveSlider(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        overlayClassName={`${isolationFadeClass} ${isSliderInteracting ? '!opacity-0 !bg-black/0' : ''}`}
        className={`sm:max-w-[500px] w-[500px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] rounded-[32px] flex flex-col transition-[background-color,border-color,box-shadow] duration-220 ease-out [&>button]:text-foreground ${
          isSliderInteracting
            ? 'bg-transparent border-transparent shadow-none backdrop-blur-none [&>button]:opacity-0 [&>button]:pointer-events-none'
            : 'bg-background border-border text-foreground'
        }`}
      >
        <DialogHeader className={`${isolationFadeClass} ${isSliderInteracting ? 'opacity-0 pointer-events-none select-none' : ''}`}>
          <div className="flex items-center gap-2">
            <BackToSettingsButton onClick={onBackToSettings} />
            <DialogTitle>{t('settings.shortcutIconSettings.title', { defaultValue: '图标设置' })}</DialogTitle>
          </div>
          <DialogDescription>
            {t('settings.shortcutIconSettings.description', { defaultValue: '调整快捷方式图标的颜色模式与圆角形状。' })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className={`leaftab-icon-settings-preview flex justify-center pt-1 ${isolationFadeClass} ${isSliderInteracting ? 'opacity-0 pointer-events-none select-none' : ''}`}>
            <div className="flex items-center justify-center" style={{ width: previewStageSize, height: previewStageSize }}>
              <ShortcutIcon
                icon={aboutIcon}
                url="https://leaftab.app/about"
                size={previewIconSize}
                exact
                frame="never"
                fallbackStyle="emptyicon"
                fallbackLabel="About"
                iconColor="#22C55E"
                iconCornerRadius={draftCornerRadius}
                iconAppearance={draftAppearance}
              />
            </div>
          </div>

          <div className={`grid w-full grid-cols-3 gap-2.5 ${isolationFadeClass} ${isSliderInteracting ? 'opacity-0 pointer-events-none select-none' : ''}`} role="radiogroup" aria-label={t('settings.shortcutIconSettings.modeLabel', { defaultValue: '颜色模式' })}>
            <AppearanceCard
              selected={draftAppearance === 'colorful'}
              onClick={() => handleAppearanceChange('colorful')}
              label={t('settings.shortcutIconSettings.colorful', { defaultValue: '彩色' })}
            />
            <AppearanceCard
              selected={draftAppearance === 'monochrome'}
              onClick={() => handleAppearanceChange('monochrome')}
              label={t('settings.shortcutIconSettings.monochrome', { defaultValue: '单色' })}
            />
            <AppearanceCard
              selected={draftAppearance === 'accent'}
              onClick={() => handleAppearanceChange('accent')}
              label={t('settings.shortcutIconSettings.accent', { defaultValue: '强调色' })}
            />
          </div>

          <div className={`${isolationFadeClass} ${activeSlider && activeSlider !== 'cornerRadius' ? 'opacity-0 pointer-events-none select-none' : ''}`}>
            <Scrubber
              className="flex-1"
              label={t('settings.shortcutIconSettings.cornerRadius', { defaultValue: '圆角' })}
              min={MIN_SHORTCUT_ICON_CORNER_RADIUS}
              max={MAX_SHORTCUT_ICON_CORNER_RADIUS}
              step={1}
              value={draftCornerRadius}
              onValueChange={handleCornerRadiusChange}
              onDragStart={() => {
                setIsSliderInteracting(true);
                setActiveSlider('cornerRadius');
              }}
              onDragEnd={() => {
                setIsSliderInteracting(false);
                setActiveSlider(null);
              }}
              ticks={11}
              decimals={0}
              showLabel
              showValue
              valueText={String(draftCornerRadius)}
              trackHeight={40}
            />
          </div>

          <div className={`${isolationFadeClass} ${activeSlider && activeSlider !== 'size' ? 'opacity-0 pointer-events-none select-none' : ''}`}>
            <Scrubber
              className="flex-1"
              label={t('settings.shortcutIconSettings.size', { defaultValue: '图标大小' })}
              min={MIN_SHORTCUT_ICON_SCALE}
              max={MAX_SHORTCUT_ICON_SCALE}
              step={1}
              value={draftScale || DEFAULT_SHORTCUT_ICON_SCALE}
              onValueChange={handleScaleChange}
              onDragStart={() => {
                setIsSliderInteracting(true);
                setActiveSlider('size');
              }}
              onDragEnd={() => {
                setIsSliderInteracting(false);
                setActiveSlider(null);
              }}
              ticks={9}
              decimals={0}
              showLabel
              showValue
              valueText={`${draftScale}%`}
              trackHeight={40}
            />
          </div>

          <Separator className={`${isolationFadeClass} ${isSliderInteracting ? 'opacity-0 pointer-events-none select-none' : ''}`} />

          <div className={`min-h-[40px] ${isolationFadeClass} ${activeSlider ? 'opacity-0 pointer-events-none select-none' : ''}`}>
            <div className="flex items-center justify-between gap-3 rounded-xl px-1 py-1">
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">{t('settings.shortcutsStyle.showName')}</span>
                <span className="text-xs text-muted-foreground">{t('settings.shortcutsStyle.showNameDesc')}</span>
              </div>
              <Switch
                checked={draftCompactShowTitle}
                onCheckedChange={handleCompactShowTitleChange}
                className="relative flex h-6 w-10 items-center justify-start rounded-full border border-border p-0.5 transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
              >
                <SwitchThumb className="h-full aspect-square rounded-full" pressedAnimation={{ width: 22 }} />
              </Switch>
            </div>
          </div>

          <div className={`flex items-center gap-2 ${isolationFadeClass} ${activeSlider && activeSlider !== 'columns' ? 'opacity-0 pointer-events-none select-none' : ''}`}>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className={`h-8 w-8 rounded-full ${isolationFadeClass} ${isSliderInteracting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              onClick={() => handleColumnsChange(Math.max(columnBounds.min, draftColumns - 1))}
              disabled={draftColumns <= columnBounds.min}
            >
              <RiSubtractLine className="size-4" />
            </Button>
            <Scrubber
              className="flex-1"
              label={t('settings.shortcutsStyle.columns')}
              min={columnBounds.min}
              max={columnBounds.max}
              step={1}
              value={draftColumns}
              onValueChange={handleColumnsChange}
              onDragStart={() => {
                setIsSliderInteracting(true);
                setActiveSlider('columns');
              }}
              onDragEnd={() => {
                setIsSliderInteracting(false);
                setActiveSlider(null);
              }}
              ticks={9}
              decimals={0}
              showLabel
              showValue
              valueText={`${draftColumns}`}
              trackHeight={40}
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className={`h-8 w-8 rounded-full ${isolationFadeClass} ${isSliderInteracting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              onClick={() => handleColumnsChange(Math.min(columnBounds.max, draftColumns + 1))}
              disabled={draftColumns >= columnBounds.max}
            >
              <RiAddLine className="size-4" />
            </Button>
          </div>
        </div>

        <DialogFooter className={`flex w-full gap-3 sm:gap-3 ${isolationFadeClass} ${isSliderInteracting ? 'opacity-0 pointer-events-none select-none' : ''}`}>
          <Button className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
