import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiAddLine, RiSubtractLine } from '@remixicon/react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch, SwitchThumb } from '@/components/animate-ui/primitives/radix/switch';
import { Slider } from '@/components/ui/slider';
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

          {draftVariant === 'compact' ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none">{t('settings.shortcutsStyle.showName')}</span>
                  <span className="text-xs text-muted-foreground">{t('settings.shortcutsStyle.showNameDesc')}</span>
                </div>
                <Switch
                  checked={draftCompactShowTitle}
                  onCheckedChange={setDraftCompactShowTitle}
                  className="relative flex h-6 w-10 items-center justify-start rounded-full border border-border p-0.5 transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                >
                  <SwitchThumb className="h-full aspect-square rounded-full" pressedAnimation={{ width: 22 }} />
                </Switch>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{t('settings.shortcutsStyle.density')}</span>
          <div className="inline-flex h-9 min-w-[118px] items-center justify-center rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground">
            <span>{`${gridColumns}*${draftRowsPerColumn}`}</span>
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
            <Slider
              min={1}
              max={11}
              step={1}
              value={[draftRowsPerColumn]}
              onValueChange={(values) => {
                const next = Math.max(1, Math.min(11, Math.round(values[0] ?? draftRowsPerColumn)));
                setDraftRowsPerColumn(next);
              }}
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
