import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import ShortcutIcon from './ShortcutIcon';
import { useTranslation } from 'react-i18next';
import type { Shortcut, ShortcutDraft, ShortcutVisualMode } from '@/types';
import { extractDomainFromUrl } from '@/utils';
import { resolveCustomIcon, resolveCustomIconFromCache } from '@/utils/iconLibrary';
import {
  getShortcutIconColor,
  normalizeShortcutIconColor,
  normalizeShortcutVisualMode,
  SHORTCUT_ICON_COLOR_PALETTE,
} from '@/utils/shortcutIconPreferences';
import { Switch, SwitchThumb } from "@/components/animate-ui/primitives/radix/switch";
import { RiCheckFill } from '@/icons/ri-compat';

interface ShortcutModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  initialShortcut?: Partial<Shortcut> | null;
  onSave: (value: ShortcutDraft) => void;
}

function IconModeCard({
  selected,
  onClick,
  label,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[52px] flex-1 items-center justify-between rounded-[16px] border px-3.5 py-2 transition-colors ${
        selected
          ? 'border-primary bg-primary/12 text-primary'
          : 'border-border bg-secondary/20 text-muted-foreground hover:bg-secondary/35 hover:text-foreground'
      }`}
    >
      <span
        className="truncate text-left text-[15px] font-medium leading-none"
      >
        {label}
      </span>
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

function SettingRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/25 px-4 py-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative flex h-6 w-10 items-center justify-start rounded-full border border-border p-0.5 transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
      >
        <SwitchThumb className="h-full aspect-square rounded-full" pressedAnimation={{ width: 22 }} />
      </Switch>
    </div>
  );
}

export default function ShortcutModal({
  isOpen,
  onOpenChange,
  mode,
  initialShortcut,
  onSave,
}: ShortcutModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialShortcut?.title || '');
  const [url, setUrl] = useState(initialShortcut?.url || '');
  const [useOfficialIcon, setUseOfficialIcon] = useState(false);
  const [autoUseOfficialIcon, setAutoUseOfficialIcon] = useState(true);
  const [iconRendering, setIconRendering] = useState<ShortcutVisualMode>('favicon');
  const [iconColor, setIconColor] = useState('');
  const [officialIconAvailable, setOfficialIconAvailable] = useState(false);
  const [userAdjustedIconSource, setUserAdjustedIconSource] = useState(false);

  const normalizedInitialColor = normalizeShortcutIconColor(initialShortcut?.iconColor);
  const hasExplicitIconPreference = Boolean(
    initialShortcut &&
    (
      typeof initialShortcut.useOfficialIcon === 'boolean' ||
      typeof initialShortcut.officialIconAvailableAtSave === 'boolean' ||
      typeof initialShortcut.iconRendering === 'string' ||
      normalizedInitialColor
    ),
  );

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialShortcut?.title || '');
    setUrl(initialShortcut?.url || '');
    setUseOfficialIcon(initialShortcut?.useOfficialIcon === true);
    setAutoUseOfficialIcon(initialShortcut?.autoUseOfficialIcon !== false);
    setIconRendering(normalizeShortcutVisualMode(initialShortcut?.iconRendering));
    setIconColor(normalizedInitialColor);
    setOfficialIconAvailable(false);
    setUserAdjustedIconSource(false);
  }, [initialShortcut, isOpen, normalizedInitialColor]);

  const domain = useMemo(() => extractDomainFromUrl(url), [url]);
  const previewColorSeed = useMemo(
    () => (domain || url || title || '').trim().toLowerCase(),
    [domain, title, url],
  );
  const effectivePreviewColor = useMemo(
    () => getShortcutIconColor(previewColorSeed, iconColor),
    [iconColor, previewColorSeed],
  );
  const selectedColor = useMemo(
    () => normalizeShortcutIconColor(iconColor),
    [iconColor],
  );
  const selectedSource = useMemo<'official' | 'favicon' | 'letter'>(
    () => (useOfficialIcon ? 'official' : iconRendering === 'letter' ? 'letter' : 'favicon'),
    [iconRendering, useOfficialIcon],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!domain) {
      setOfficialIconAvailable(false);
      return;
    }

    let cancelled = false;
    const cachedResolved = resolveCustomIconFromCache(domain);
    const cachedAvailable = Boolean(cachedResolved?.url);
    setOfficialIconAvailable(cachedAvailable);

    if (cachedAvailable && !hasExplicitIconPreference && !userAdjustedIconSource) {
      setUseOfficialIcon(true);
    }

    void resolveCustomIcon(domain).then((resolved) => {
      if (cancelled) return;
      const available = Boolean(resolved?.url);
      setOfficialIconAvailable(available);
      if (!available) {
        setUseOfficialIcon(false);
        return;
      }
      if (!hasExplicitIconPreference && !userAdjustedIconSource) {
        setUseOfficialIcon(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [domain, hasExplicitIconPreference, isOpen, userAdjustedIconSource]);

  const handleSave = () => {
    if (!title.trim() || !url.trim()) {
      toast.error(t('shortcutModal.errors.fillAll'), {
        description: t('shortcutModal.errors.fillAllDesc'),
      });
      return;
    }
    onSave({
      title: title.trim(),
      url: url.trim(),
      icon: initialShortcut?.icon || '',
      useOfficialIcon: officialIconAvailable ? useOfficialIcon : false,
      autoUseOfficialIcon,
      officialIconAvailableAtSave: officialIconAvailable,
      iconRendering,
      iconColor,
    });
  };

  const handleOfficialSwitchChange = (checked: boolean) => {
    if (checked && !officialIconAvailable) {
      toast.info(
        t('shortcutModal.icon.officialUnavailable', {
          defaultValue: '这个图标暂时还没有适配官方图标',
        }),
      );
      setUseOfficialIcon(false);
      return;
    }
    setUserAdjustedIconSource(true);
    setUseOfficialIcon(checked);
  };

  const handleSelectSource = (nextSource: 'official' | 'favicon' | 'letter') => {
    if (nextSource === 'official') {
      handleOfficialSwitchChange(true);
      return;
    }
    if (nextSource === 'favicon') {
      toast.info(
        t('shortcutModal.icon.networkHint', {
          defaultValue: '网络图标可能无法获取，获取失败时会自动回退为文字图标',
        }),
      );
    }
    setUserAdjustedIconSource(true);
    setUseOfficialIcon(false);
    setIconRendering(nextSource);
  };

  const handleSelectColor = (color: string) => {
    setUserAdjustedIconSource(true);
    if (useOfficialIcon) {
      setUseOfficialIcon(false);
      setIconRendering('favicon');
    }
    setIconColor(color);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ width: 'min(520px, calc(100vw - 32px))', maxWidth: 'min(520px, calc(100vw - 32px))' }}
        className="w-full sm:max-w-[520px] max-w-[calc(100vw-32px)] bg-background border-border text-foreground rounded-[32px] overflow-hidden p-6 flex flex-col"
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">{mode === 'add' ? t('shortcutModal.addTitle') : t('shortcutModal.editTitle')}</DialogTitle>
        </DialogHeader>
        <div className="no-scrollbar mt-6 flex max-h-[min(560px,calc(100vh-180px))] flex-col gap-7 overflow-y-auto">
          <div className="flex justify-center pt-1">
            <ShortcutIcon
              icon={initialShortcut?.icon || ''}
              url={url}
              size={76}
              frame="never"
              fallbackStyle="emptyicon"
              fallbackLabel={title}
              useOfficialIcon={officialIconAvailable ? useOfficialIcon : false}
              autoUseOfficialIcon={autoUseOfficialIcon}
              officialIconAvailableAtSave={officialIconAvailable}
              iconRendering={iconRendering}
              iconColor={effectivePreviewColor}
            />
          </div>

          <div className="flex w-full flex-col items-center gap-6">
            <input
              id="shortcut-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('shortcutModal.namePlaceholder')}
              className="no-pill-radius appearance-none h-9 w-full !rounded-none border-0 border-b border-border/80 bg-transparent px-0 pb-2 text-center text-lg font-semibold text-foreground shadow-none outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary focus:outline-none focus:ring-0"
            />
            <input
              id="shortcut-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('shortcutModal.urlPlaceholder')}
              className="no-pill-radius appearance-none h-8 w-full !rounded-none border-0 border-b border-border/80 bg-transparent px-0 pb-2 text-center text-sm text-muted-foreground shadow-none outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary focus:outline-none focus:ring-0"
            />
          </div>

          <div className="flex w-full flex-col gap-4">
            <div className="grid w-full grid-cols-3 gap-3" role="radiogroup" aria-label={t('shortcutModal.icon.modeGroup', { defaultValue: '图标来源' })}>
              <IconModeCard
                selected={selectedSource === 'official'}
                onClick={() => handleSelectSource('official')}
                label={t('shortcutModal.icon.modeOfficialShort', { defaultValue: '官方' })}
              />
              <IconModeCard
                selected={selectedSource === 'favicon'}
                onClick={() => handleSelectSource('favicon')}
                label={t('shortcutModal.icon.modeFaviconShort', { defaultValue: '网络' })}
              />
              <IconModeCard
                selected={selectedSource === 'letter'}
                onClick={() => handleSelectSource('letter')}
                label={t('shortcutModal.icon.modeLetterShort', { defaultValue: '文字' })}
              />
            </div>

            {!officialIconAvailable ? (
              <SettingRow
                label={t('shortcutModal.icon.autoOfficial', { defaultValue: '适配后自动切换官方图标' })}
                checked={autoUseOfficialIcon}
                onCheckedChange={setAutoUseOfficialIcon}
              />
            ) : null}

            <div className="grid w-full grid-cols-7 gap-3">
              {SHORTCUT_ICON_COLOR_PALETTE.map((color) => {
                const selected = color === selectedColor;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleSelectColor(color)}
                    className={`flex aspect-square w-full items-center justify-center rounded-full border transition-transform hover:scale-105 ${
                      selected ? 'border-foreground/70 shadow-[0_0_0_2px_rgba(255,255,255,0.08)]' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                    aria-label={color}
                  >
                    {selected ? <RiCheckFill className="size-4 text-white" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 flex w-full gap-4">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl transition-colors text-[14px]"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-colors text-[14px] font-medium"
          >
            {t('common.save')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
