import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { toast } from '@/components/ui/sonner';
import ShortcutIcon from './ShortcutIcon';
import { useTranslation } from 'react-i18next';
import type { Shortcut, ShortcutDraft, ShortcutVisualMode } from '@/types';
import { extractDomainFromUrl } from '@/utils';
import {
  prepareShortcutCustomIcon,
  readShortcutCustomIcon,
} from '@/utils/shortcutCustomIcons';
import { resolveCustomIcon, resolveCustomIconFromCache } from '@/utils/iconLibrary';
import {
  getShortcutIconColor,
  normalizeShortcutIconColor,
  normalizeShortcutVisualMode,
  SHORTCUT_ICON_COLOR_PALETTE,
} from '@/utils/shortcutIconPreferences';
import { Switch, SwitchThumb } from '@/components/animate-ui/primitives/radix/switch';
import { RiCheckFill, RiPencilFill } from '@/icons/ri-compat';

interface ShortcutEditorPanelProps {
  mode: 'add' | 'edit';
  initialShortcut?: Partial<Shortcut> | null;
  open?: boolean;
  onSave: (
    value: ShortcutDraft,
    localOnly?: {
      useCustomIcon?: boolean;
      customIconDataUrl?: string | null;
    },
  ) => void;
  onCancel?: () => void;
  title?: string;
  description?: ReactNode;
  afterUrlField?: ReactNode;
  compact?: boolean;
  containerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  previewSize?: number;
}

function IconModeCard({
  selected,
  onClick,
  label,
  disabled,
  testId,
  compact,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  testId?: string;
  compact?: boolean;
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
      data-testid={testId}
      className={`flex flex-1 items-center justify-between rounded-[16px] border transition-colors ${
        selected
          ? 'border-primary bg-primary/12 text-primary'
          : 'border-border bg-secondary/20 text-muted-foreground hover:bg-secondary/35 hover:text-foreground'
      } ${compact ? 'min-h-[44px] px-3 py-1.5' : 'min-h-[52px] px-3.5 py-2'}`}
    >
      <span className={`truncate text-left font-medium leading-none ${compact ? 'text-[14px]' : 'text-[15px]'}`}>
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
  disabled,
  testId,
  compact,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  testId?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/25 ${disabled ? 'opacity-60' : ''} ${compact ? 'px-3.5 py-2.5' : 'px-4 py-3'}`} data-testid={testId}>
      <span className={`font-medium ${disabled ? 'text-muted-foreground' : 'text-foreground'} ${compact ? 'text-[13px]' : 'text-sm'}`}>{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={disabled ? undefined : onCheckedChange}
        disabled={disabled}
        data-testid={testId ? `${testId}-switch` : `shortcut-setting-${label}`}
        className="relative flex h-6 w-10 items-center justify-start rounded-full border border-border p-0.5 transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
      >
        <SwitchThumb className="h-full aspect-square rounded-full" pressedAnimation={{ width: 22 }} />
      </Switch>
    </div>
  );
}

export function ShortcutEditorPanel({
  mode,
  initialShortcut,
  open = true,
  onSave,
  onCancel,
  title: titleOverride,
  description,
  afterUrlField,
  compact = false,
  containerClassName,
  bodyClassName,
  footerClassName,
  previewSize = 76,
}: ShortcutEditorPanelProps) {
  const { t } = useTranslation();
  const customFileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initialShortcut?.title || '');
  const [url, setUrl] = useState(initialShortcut?.url || '');
  const [useOfficialIcon, setUseOfficialIcon] = useState(false);
  const [autoUseOfficialIcon, setAutoUseOfficialIcon] = useState(true);
  const [iconRendering, setIconRendering] = useState<ShortcutVisualMode>('favicon');
  const [iconColor, setIconColor] = useState('');
  const [officialIconAvailable, setOfficialIconAvailable] = useState(false);
  const [userAdjustedIconSource, setUserAdjustedIconSource] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'official' | 'favicon' | 'letter' | 'custom'>('favicon');
  const [customIconDataUrl, setCustomIconDataUrl] = useState('');
  const [customIconLoading, setCustomIconLoading] = useState(false);

  const normalizedInitialColor = normalizeShortcutIconColor(initialShortcut?.iconColor);
  const initialTitle = initialShortcut?.title || '';
  const initialUrl = initialShortcut?.url || '';
  const initialShortcutId = typeof initialShortcut?.id === 'string' ? initialShortcut.id : '';
  const initialUseOfficialIcon = initialShortcut?.useOfficialIcon === true;
  const initialAutoUseOfficialIcon = initialShortcut?.autoUseOfficialIcon !== false;
  const initialIconRendering = normalizeShortcutVisualMode(initialShortcut?.iconRendering);
  const initialCustomIconDataUrl = useMemo(
    () => (initialShortcutId ? readShortcutCustomIcon(initialShortcutId) : ''),
    [initialShortcutId],
  );
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
    if (!open) return;
    setTitle(initialTitle);
    setUrl(initialUrl);
    setUseOfficialIcon(initialUseOfficialIcon);
    setAutoUseOfficialIcon(initialAutoUseOfficialIcon);
    setIconRendering(initialIconRendering);
    setIconColor(normalizedInitialColor);
    setOfficialIconAvailable(false);
    setUserAdjustedIconSource(false);
    setCustomIconDataUrl(initialCustomIconDataUrl);
    setSelectedSource(
      initialCustomIconDataUrl
        ? 'custom'
        : initialUseOfficialIcon
          ? 'official'
          : initialIconRendering === 'letter'
            ? 'letter'
            : 'favicon',
    );
  }, [
    initialAutoUseOfficialIcon,
    initialCustomIconDataUrl,
    initialIconRendering,
    initialTitle,
    initialUrl,
    initialUseOfficialIcon,
    normalizedInitialColor,
    open,
  ]);

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
  const colorSelectionDisabled = selectedSource === 'custom';
  const autoOfficialLocked = officialIconAvailable && selectedSource === 'official' && useOfficialIcon;
  const hasCustomIcon = Boolean(customIconDataUrl);
  const resolvedTitle = titleOverride || (mode === 'add' ? t('shortcutModal.addTitle') : t('shortcutModal.editTitle'));
  const fallbackSource = iconRendering === 'letter' ? 'letter' : 'favicon';

  useEffect(() => {
    if (!open) return;
    if (!domain) {
      setOfficialIconAvailable(false);
      if (!hasExplicitIconPreference && !userAdjustedIconSource) {
        setUseOfficialIcon(false);
        setSelectedSource((prev) => (prev === 'custom' ? prev : fallbackSource));
      }
      return;
    }

    let cancelled = false;
    const cachedResolved = resolveCustomIconFromCache(domain);
    const cachedAvailable = Boolean(cachedResolved?.url);
    setOfficialIconAvailable(cachedAvailable);

    if (cachedAvailable && !hasExplicitIconPreference && !userAdjustedIconSource) {
      setUseOfficialIcon(true);
      setSelectedSource((prev) => (prev === 'custom' ? prev : 'official'));
    }
    if (!cachedAvailable && !hasExplicitIconPreference && !userAdjustedIconSource) {
      setUseOfficialIcon(false);
      setSelectedSource((prev) => (prev === 'custom' ? prev : fallbackSource));
    }

    void resolveCustomIcon(domain).then((resolved) => {
      if (cancelled) return;
      const available = Boolean(resolved?.url);
      setOfficialIconAvailable(available);
      if (!available) {
        setUseOfficialIcon(false);
        if (!hasExplicitIconPreference && !userAdjustedIconSource) {
          setSelectedSource((prev) => (prev === 'custom' ? prev : fallbackSource));
        }
        return;
      }
      if (!hasExplicitIconPreference && !userAdjustedIconSource) {
        setUseOfficialIcon(true);
        setSelectedSource((prev) => (prev === 'custom' ? prev : 'official'));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [domain, fallbackSource, hasExplicitIconPreference, open, userAdjustedIconSource]);

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
      iconColor: normalizeShortcutIconColor(iconColor),
    }, {
      useCustomIcon: selectedSource === 'custom' && Boolean(customIconDataUrl),
      customIconDataUrl: selectedSource === 'custom' ? customIconDataUrl : null,
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
    if (checked) setSelectedSource('official');
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
    setSelectedSource(nextSource);
  };

  const handleSelectColor = (color: string) => {
    if (colorSelectionDisabled) return;
    setUserAdjustedIconSource(true);
    if (useOfficialIcon) {
      setUseOfficialIcon(false);
      setIconRendering('favicon');
      setSelectedSource('favicon');
    }
    setIconColor(color);
  };

  const handleCustomButtonClick = () => {
    if (customIconLoading) return;
    if (hasCustomIcon) {
      if (selectedSource !== 'custom') {
        setUserAdjustedIconSource(true);
        setUseOfficialIcon(false);
        setSelectedSource('custom');
      }
      return;
    }
    if (customFileInputRef.current) {
      customFileInputRef.current.value = '';
      customFileInputRef.current.click();
    }
  };

  const handleCustomPreviewClick = () => {
    if (customIconLoading || !hasCustomIcon) return;
    if (customFileInputRef.current) {
      customFileInputRef.current.value = '';
      customFileInputRef.current.click();
    }
  };

  const handleCustomFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCustomIconLoading(true);
    try {
      const processedDataUrl = await prepareShortcutCustomIcon(file);
      setCustomIconDataUrl(processedDataUrl);
      setSelectedSource('custom');
      setUserAdjustedIconSource(true);
    } catch {
      toast.error(
        t('shortcutModal.icon.customFileInvalid', {
          defaultValue: '这张图片暂时无法作为图标，请换一张试试',
        }),
      );
    } finally {
      setCustomIconLoading(false);
    }
  };

  const previewNode = (
    <ShortcutIcon
      icon={initialShortcut?.icon || ''}
      url={url}
      shortcutId={initialShortcutId}
      localCustomIconDataUrl={selectedSource === 'custom' ? customIconDataUrl : ''}
      allowStoredCustomIcon={false}
      size={previewSize}
      frame="never"
      fallbackStyle="emptyicon"
      fallbackLabel={title}
      useOfficialIcon={officialIconAvailable ? useOfficialIcon : false}
      autoUseOfficialIcon={autoUseOfficialIcon}
      officialIconAvailableAtSave={officialIconAvailable}
      iconRendering={iconRendering}
      iconColor={effectivePreviewColor}
    />
  );

  const shouldShowCustomPreviewAction = selectedSource === 'custom' && hasCustomIcon;

  const previewContent = shouldShowCustomPreviewAction ? (
    <button
      type="button"
      onClick={handleCustomPreviewClick}
      disabled={customIconLoading}
      data-testid="shortcut-custom-preview-trigger"
      aria-label={t('shortcutModal.icon.modeCustomReplaceShort', { defaultValue: '更改' })}
      className="group relative inline-flex rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {previewNode}
      <span className="pointer-events-none absolute inset-0 flex items-end justify-center rounded-[22px] bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/28 group-hover:opacity-100 group-focus-visible:bg-black/28 group-focus-visible:opacity-100">
        <span className="mb-1.5 flex size-8 items-center justify-center rounded-full bg-black/45 text-white shadow-sm">
          <RiPencilFill className="size-4" />
        </span>
      </span>
    </button>
  ) : (
    previewNode
  );

  return (
    <div className={containerClassName ?? 'flex flex-col'}>
      <div className="space-y-1">
        <h2 className={`${compact ? 'text-[17px]' : 'text-lg'} font-semibold text-foreground`}>{resolvedTitle}</h2>
        {description ? <div className={`${compact ? 'text-[13px]' : 'text-sm'} text-muted-foreground`}>{description}</div> : null}
      </div>

      <div className={bodyClassName ?? 'no-scrollbar mt-6 flex max-h-[min(560px,calc(100vh-180px))] flex-col gap-7 overflow-y-auto'}>
        <div className="flex justify-center pt-1">
          {previewContent}
        </div>

        <div className={`flex w-full flex-col items-center ${compact ? 'gap-4' : 'gap-5'}`}>
          <input
            id="shortcut-title"
            data-testid="shortcut-modal-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('shortcutModal.namePlaceholder')}
            className={`no-pill-radius appearance-none w-full !rounded-none border-0 border-b border-border/80 bg-transparent px-0 pb-2 text-center font-semibold text-foreground shadow-none outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary focus:outline-none focus:ring-0 ${compact ? 'h-8 text-[17px]' : 'h-9 text-lg'}`}
          />
          <input
            id="shortcut-url"
            data-testid="shortcut-modal-url"
            type="text"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={t('shortcutModal.urlPlaceholder')}
            className={`no-pill-radius appearance-none w-full !rounded-none border-0 border-b border-border/80 bg-transparent px-0 pb-2 text-center text-muted-foreground shadow-none outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary focus:outline-none focus:ring-0 ${compact ? 'h-7 text-[13px]' : 'h-8 text-sm'}`}
          />
          {afterUrlField ? <div className="w-full">{afterUrlField}</div> : null}
        </div>

        <div className={`flex w-full flex-col ${compact ? 'gap-3' : 'gap-3.5'}`}>
          <div className={`grid w-full grid-cols-4 ${compact ? 'gap-2' : 'gap-2.5'}`} role="radiogroup" aria-label={t('shortcutModal.icon.modeGroup', { defaultValue: '图标来源' })}>
            <IconModeCard
              selected={selectedSource === 'official'}
              onClick={() => handleSelectSource('official')}
              label={t('shortcutModal.icon.modeOfficialShort', { defaultValue: '官方' })}
              testId="shortcut-icon-mode-official"
              compact={compact}
            />
            <IconModeCard
              selected={selectedSource === 'favicon'}
              onClick={() => handleSelectSource('favicon')}
              label={t('shortcutModal.icon.modeFaviconShort', { defaultValue: '网络' })}
              testId="shortcut-icon-mode-favicon"
              compact={compact}
            />
            <IconModeCard
              selected={selectedSource === 'letter'}
              onClick={() => handleSelectSource('letter')}
              label={t('shortcutModal.icon.modeLetterShort', { defaultValue: '文字' })}
              testId="shortcut-icon-mode-letter"
              compact={compact}
            />
            <IconModeCard
              selected={selectedSource === 'custom'}
              onClick={handleCustomButtonClick}
              label={customIconLoading
                ? t('shortcutModal.icon.modeCustomLoadingShort', { defaultValue: '处理中' })
                : t('shortcutModal.icon.modeCustomShort', { defaultValue: '自定义' })}
              testId="shortcut-icon-mode-custom"
              disabled={customIconLoading}
              compact={compact}
            />
          </div>
          <input
            ref={customFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCustomFileChange}
          />

          <SettingRow
            label={t('shortcutModal.icon.autoOfficial', { defaultValue: '适配后自动切换官方图标' })}
            checked={autoOfficialLocked ? true : autoUseOfficialIcon}
            onCheckedChange={setAutoUseOfficialIcon}
            disabled={autoOfficialLocked}
            testId="shortcut-auto-official"
            compact={compact}
          />

            <div className={`grid w-full grid-cols-7 ${compact ? 'gap-2' : 'gap-2.5'}`}>
            {SHORTCUT_ICON_COLOR_PALETTE.map((color) => {
              const selected = color === selectedColor;
              return (
                <button
                  key={color}
                  type="button"
                  disabled={colorSelectionDisabled}
                  onClick={() => handleSelectColor(color)}
                  data-testid={`shortcut-color-${color}`}
                  className={`mx-auto flex items-center justify-center rounded-full border transition-transform ${
                    colorSelectionDisabled
                      ? 'cursor-not-allowed opacity-40'
                      : 'cursor-pointer hover:scale-105'
                  } ${
                    selected ? 'border-foreground/70 shadow-[0_0_0_2px_rgba(255,255,255,0.08)]' : 'border-transparent'
                  } ${compact ? 'size-9' : 'aspect-square w-full'}`}
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

      <div className={footerClassName ?? 'mt-5 flex w-full gap-4'}>
        <button
          type="button"
          onClick={onCancel}
          data-testid="shortcut-modal-cancel"
          className="flex-1 rounded-xl bg-secondary px-4 py-2 text-[14px] text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          data-testid="shortcut-modal-save"
          className="flex-1 rounded-xl bg-primary px-4 py-2 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t('common.save')}
        </button>
      </div>
    </div>
  );
}
