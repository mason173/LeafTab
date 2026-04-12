import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiAddLine, RiSubtractLine } from '@/icons/ri-compat';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch, SwitchThumb } from '@/components/animate-ui/primitives/radix/switch';
import Scrubber from '@/components/ui/smoothui/scrubber';
import { BackToSettingsButton } from '@/components/BackToSettingsButton';
import {
  clampShortcutGridColumns,
  DEFAULT_SHORTCUT_CARD_VARIANT,
  getShortcutColumnBounds,
  type ShortcutCardVariant,
} from '@/components/shortcuts/shortcutCardVariant';

interface ShortcutStyleSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackToSettings?: () => void;
  variant: ShortcutCardVariant;
  compactShowTitle: boolean;
  columns: number;
  onSave: (payload: { variant: ShortcutCardVariant; compactShowTitle: boolean; columns: number }) => void;
}

export function ShortcutStyleSettingsDialog({
  open,
  onOpenChange,
  onBackToSettings,
  variant,
  compactShowTitle,
  columns,
  onSave,
}: ShortcutStyleSettingsDialogProps) {
  const { t } = useTranslation();
  // Keep the rich/default variant implementation in the codebase,
  // but expose only the compact variant in settings.
  const activeVariant: ShortcutCardVariant = DEFAULT_SHORTCUT_CARD_VARIANT;
  void variant;
  const [draftColumns, setDraftColumns] = useState(() => clampShortcutGridColumns(columns, activeVariant));
  const [draftCompactShowTitle, setDraftCompactShowTitle] = useState(compactShowTitle);
  const [isColumnsSliderInteracting, setIsColumnsSliderInteracting] = useState(false);
  const isSliderIsolation = isColumnsSliderInteracting;
  const isolationFadeClass = 'transition-opacity duration-220 ease-out';

  useEffect(() => {
    if (!open) {
      setIsColumnsSliderInteracting(false);
      return;
    }
    setDraftColumns(clampShortcutGridColumns(columns, activeVariant));
    setDraftCompactShowTitle(compactShowTitle);
  }, [activeVariant, columns, compactShowTitle, open]);

  const columnBounds = useMemo(() => getShortcutColumnBounds(activeVariant), [activeVariant]);

  const emitLiveUpdate = (nextCompactShowTitle: boolean, nextColumns: number) => {
    onSave({
      variant: activeVariant,
      compactShowTitle: nextCompactShowTitle,
      columns: nextColumns,
    });
  };

  const handleCompactShowTitleChange = (nextCompactShowTitle: boolean) => {
    setDraftCompactShowTitle(nextCompactShowTitle);
    emitLiveUpdate(nextCompactShowTitle, draftColumns);
  };

  const handleColumnsChange = (nextRawValue: number) => {
    const nextColumns = clampShortcutGridColumns(Math.round(nextRawValue), activeVariant);
    setDraftColumns(nextColumns);
    emitLiveUpdate(draftCompactShowTitle, nextColumns);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsColumnsSliderInteracting(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName={`${isolationFadeClass} ${isSliderIsolation ? '!opacity-0 !bg-black/0' : ''}`}
        className={`sm:max-w-[500px] w-[500px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] rounded-[32px] flex flex-col transition-[background-color,border-color,box-shadow] duration-220 ease-out [&>button]:text-foreground ${
          isSliderIsolation
            ? 'bg-transparent border-transparent shadow-none backdrop-blur-none [&>button]:opacity-0 [&>button]:pointer-events-none'
            : 'bg-background border-border text-foreground'
        }`}
      >
        <DialogHeader className={`${isolationFadeClass} ${isSliderIsolation ? 'opacity-0 pointer-events-none select-none' : ''}`}>
          <div className="flex items-center gap-2">
            <BackToSettingsButton onClick={onBackToSettings} />
            <DialogTitle>{t('settings.shortcutsStyle.title')}</DialogTitle>
          </div>
          <DialogDescription>{t('settings.shortcutsStyle.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className={`min-h-[40px] ${isolationFadeClass} ${isSliderIsolation ? 'opacity-0 pointer-events-none select-none' : ''}`}>
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

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className={`h-8 w-8 rounded-full ${isolationFadeClass} ${isSliderIsolation ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
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
              onDragStart={() => setIsColumnsSliderInteracting(true)}
              onDragEnd={() => setIsColumnsSliderInteracting(false)}
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
              className={`h-8 w-8 rounded-full ${isolationFadeClass} ${isSliderIsolation ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              onClick={() => handleColumnsChange(Math.min(columnBounds.max, draftColumns + 1))}
              disabled={draftColumns >= columnBounds.max}
            >
              <RiAddLine className="size-4" />
            </Button>
          </div>

        </div>

        <DialogFooter className={`flex w-full gap-3 sm:gap-3 ${isolationFadeClass} ${isSliderIsolation ? 'opacity-0 pointer-events-none select-none' : ''}`}>
          <Button className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
