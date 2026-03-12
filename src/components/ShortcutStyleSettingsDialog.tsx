import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiAddLine, RiSubtractLine } from '@remixicon/react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch, SwitchThumb } from '@/components/animate-ui/primitives/radix/switch';
import Scrubber from '@/components/ui/smoothui/scrubber';
import {
  DEFAULT_SHORTCUT_CARD_VARIANT,
  getShortcutColumns,
  type ShortcutCardVariant,
} from '@/components/shortcuts/shortcutCardVariant';

interface ShortcutStyleSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: ShortcutCardVariant;
  compactShowTitle: boolean;
  rowsPerColumn: number;
  onSave: (payload: { variant: ShortcutCardVariant; compactShowTitle: boolean; rowsPerColumn: number }) => void;
}

export function ShortcutStyleSettingsDialog({
  open,
  onOpenChange,
  variant,
  compactShowTitle,
  rowsPerColumn,
  onSave,
}: ShortcutStyleSettingsDialogProps) {
  const { t } = useTranslation();
  const [draftVariant, setDraftVariant] = useState<ShortcutCardVariant>(variant || DEFAULT_SHORTCUT_CARD_VARIANT);
  const [draftRowsPerColumn, setDraftRowsPerColumn] = useState(rowsPerColumn);
  const [draftCompactShowTitle, setDraftCompactShowTitle] = useState(compactShowTitle);

  useEffect(() => {
    if (!open) return;
    setDraftVariant(variant || DEFAULT_SHORTCUT_CARD_VARIANT);
    setDraftRowsPerColumn(rowsPerColumn);
    setDraftCompactShowTitle(compactShowTitle);
  }, [open, variant, rowsPerColumn, compactShowTitle]);

  const gridColumns = useMemo(() => getShortcutColumns(draftVariant), [draftVariant]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] w-[500px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] bg-background border-border text-foreground rounded-[32px] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('settings.shortcutsStyle.title')}</DialogTitle>
          <DialogDescription>{t('settings.shortcutsStyle.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Tabs value={draftVariant} onValueChange={(value) => setDraftVariant(value as ShortcutCardVariant)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-[16px]">
              <TabsTrigger value="default" className="rounded-xl">{t('settings.shortcutsStyle.rich')}</TabsTrigger>
              <TabsTrigger value="compact" className="rounded-xl">{t('settings.shortcutsStyle.compact')}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="min-h-[40px]">
            <div className={`flex items-center justify-between gap-3 rounded-xl px-1 py-1 ${draftVariant !== 'compact' ? 'opacity-55' : ''}`}>
              <div className="flex flex-col">
                <span className={`text-sm font-medium leading-none ${draftVariant !== 'compact' ? 'text-muted-foreground' : ''}`}>{t('settings.shortcutsStyle.showName')}</span>
                <span className="text-xs text-muted-foreground">{t('settings.shortcutsStyle.showNameDesc')}</span>
              </div>
              <Switch
                checked={draftVariant === 'compact' ? draftCompactShowTitle : true}
                onCheckedChange={draftVariant === 'compact' ? setDraftCompactShowTitle : undefined}
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
              className="h-8 w-8 rounded-full"
              onClick={() => setDraftRowsPerColumn((prev) => Math.max(1, prev - 1))}
              disabled={draftRowsPerColumn <= 1}
            >
              <RiSubtractLine className="size-4" />
            </Button>
            <Scrubber
              className="flex-1"
              label={t('settings.shortcutsStyle.density')}
              min={1}
              max={11}
              step={1}
              value={draftRowsPerColumn}
              onValueChange={(nextRawValue) => {
                const next = Math.max(1, Math.min(11, Math.round(nextRawValue)));
                setDraftRowsPerColumn(next);
              }}
              ticks={9}
              decimals={0}
              showLabel
              showValue
              valueText={`${gridColumns}*${draftRowsPerColumn}`}
              trackHeight={40}
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setDraftRowsPerColumn((prev) => Math.min(11, prev + 1))}
              disabled={draftRowsPerColumn >= 11}
            >
              <RiAddLine className="size-4" />
            </Button>
          </div>
        </div>

        <DialogFooter className="flex w-full gap-3 sm:gap-3">
          <Button className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onSave({
                variant: draftVariant,
                compactShowTitle: draftCompactShowTitle,
                rowsPerColumn: draftRowsPerColumn,
              });
              onOpenChange(false);
            }}
          >
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
