import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiAddLine, RiSubtractLine } from '@/icons/ri-compat';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch, SwitchThumb } from '@/components/animate-ui/primitives/radix/switch';
import Scrubber from '@/components/ui/smoothui/scrubber';
import { BackToSettingsButton } from '@/components/BackToSettingsButton';
import {
  clampShortcutGridColumns,
  DEFAULT_SHORTCUT_CARD_VARIANT,
  getShortcutColumnBounds,
  getShortcutColumns,
  type ShortcutCardVariant,
} from '@/components/shortcuts/shortcutCardVariant';

const SHORTCUT_GRID_COLUMNS_BY_VARIANT_KEY = 'shortcutGridColumnsByVariant';

function readColumnsByVariant(variant: ShortcutCardVariant): number | null {
  try {
    const raw = localStorage.getItem(SHORTCUT_GRID_COLUMNS_BY_VARIANT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next = Number(parsed?.[variant]);
    if (!Number.isFinite(next)) return null;
    return clampShortcutGridColumns(next, variant);
  } catch {
    return null;
  }
}

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
  const [draftVariant, setDraftVariant] = useState<ShortcutCardVariant>(variant || DEFAULT_SHORTCUT_CARD_VARIANT);
  const [draftColumns, setDraftColumns] = useState(columns);
  const [draftCompactShowTitle, setDraftCompactShowTitle] = useState(compactShowTitle);
  const [isColumnsSliderInteracting, setIsColumnsSliderInteracting] = useState(false);
  const columnsByVariantRef = useRef<Partial<Record<ShortcutCardVariant, number>>>({});
  const isSliderIsolation = isColumnsSliderInteracting;
  const isolationFadeClass = 'transition-opacity duration-220 ease-out';

  useEffect(() => {
    if (!open) {
      setIsColumnsSliderInteracting(false);
      return;
    }
    setDraftVariant(variant || DEFAULT_SHORTCUT_CARD_VARIANT);
    setDraftColumns(columns);
    setDraftCompactShowTitle(compactShowTitle);
    columnsByVariantRef.current[variant || DEFAULT_SHORTCUT_CARD_VARIANT] = clampShortcutGridColumns(
      columns,
      variant || DEFAULT_SHORTCUT_CARD_VARIANT,
    );
  }, [open, variant, columns, compactShowTitle]);

  const columnBounds = useMemo(() => getShortcutColumnBounds(draftVariant), [draftVariant]);
  const resolveColumnsForVariant = (nextVariant: ShortcutCardVariant, fallbackColumns: number): number => {
    const remembered = columnsByVariantRef.current[nextVariant];
    if (Number.isFinite(remembered)) {
      return clampShortcutGridColumns(remembered as number, nextVariant);
    }
    const saved = readColumnsByVariant(nextVariant);
    if (saved !== null) return saved;
    const normalized = clampShortcutGridColumns(fallbackColumns, nextVariant);
    if (Number.isFinite(normalized)) return normalized;
    return getShortcutColumns(nextVariant);
  };

  const emitLiveUpdate = (
    nextVariant: ShortcutCardVariant,
    nextCompactShowTitle: boolean,
    nextColumns: number,
  ) => {
    onSave({
      variant: nextVariant,
      compactShowTitle: nextCompactShowTitle,
      columns: nextColumns,
    });
  };

  const handleVariantChange = (value: string) => {
    const nextVariant = value as ShortcutCardVariant;
    const nextColumns = resolveColumnsForVariant(nextVariant, draftColumns);
    setDraftVariant(nextVariant);
    setDraftColumns(nextColumns);
    columnsByVariantRef.current[nextVariant] = nextColumns;
    emitLiveUpdate(nextVariant, draftCompactShowTitle, nextColumns);
  };

  const handleCompactShowTitleChange = (nextCompactShowTitle: boolean) => {
    setDraftCompactShowTitle(nextCompactShowTitle);
    emitLiveUpdate(draftVariant, nextCompactShowTitle, draftColumns);
  };

  const handleColumnsChange = (nextRawValue: number) => {
    const nextColumns = clampShortcutGridColumns(Math.round(nextRawValue), draftVariant);
    setDraftColumns(nextColumns);
    columnsByVariantRef.current[draftVariant] = nextColumns;
    emitLiveUpdate(draftVariant, draftCompactShowTitle, nextColumns);
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
          <Tabs
            value={draftVariant}
            onValueChange={handleVariantChange}
            className={`w-full ${isolationFadeClass} ${isSliderIsolation ? 'opacity-0 pointer-events-none select-none' : ''}`}
          >
            <TabsList className="grid w-full grid-cols-2 rounded-[16px]">
              <TabsTrigger value="compact" className="rounded-xl">{t('settings.shortcutsStyle.compact')}</TabsTrigger>
              <TabsTrigger value="default" className="rounded-xl">{t('settings.shortcutsStyle.rich')}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className={`min-h-[40px] ${isolationFadeClass} ${isSliderIsolation ? 'opacity-0 pointer-events-none select-none' : ''}`}>
            <div className={`flex items-center justify-between gap-3 rounded-xl px-1 py-1 ${draftVariant !== 'compact' ? 'opacity-55' : ''}`}>
              <div className="flex flex-col">
                <span className={`text-sm font-medium leading-none ${draftVariant !== 'compact' ? 'text-muted-foreground' : ''}`}>{t('settings.shortcutsStyle.showName')}</span>
                <span className="text-xs text-muted-foreground">{t('settings.shortcutsStyle.showNameDesc')}</span>
              </div>
              <Switch
                checked={draftVariant === 'compact' ? draftCompactShowTitle : true}
                onCheckedChange={draftVariant === 'compact' ? handleCompactShowTitleChange : undefined}
                disabled={draftVariant !== 'compact'}
                className={`relative flex h-6 w-10 items-center justify-start rounded-full border p-0.5 transition-colors data-[state=checked]:justify-end ${
                  draftVariant !== 'compact'
                    ? 'cursor-not-allowed border-border/70 data-[state=checked]:bg-secondary data-[state=unchecked]:bg-secondary'
                    : 'border-border data-[state=checked]:bg-primary data-[state=unchecked]:bg-input'
                }`}
              >
                <SwitchThumb
                  className={`h-full aspect-square rounded-full ${draftVariant !== 'compact' ? '!bg-muted-foreground/55' : ''}`}
                  pressedAnimation={{ width: 22 }}
                />
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
