import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { ShortcutColorSlider } from '@/components/ShortcutColorSlider';
import ShortcutIcon from '@/components/ShortcutIcon';
import { Switch, SwitchThumb } from '@/components/animate-ui/primitives/radix/switch';
import { RiCheckFill, RiPencilFill } from '@/icons/ri-compat';
import type { ScenarioMode } from '@/scenario/scenario';
import type { Shortcut, ShortcutDraft, ShortcutIconAppearance, ShortcutVisualMode } from '@/types';
import { extractDomainFromUrl } from '@/utils';
import {
  prepareShortcutCustomIcon,
  readShortcutCustomIcon,
} from '@/utils/shortcutCustomIcons';
import {
  resolveCustomIcon,
  resolveCustomIconFromCache,
  type ResolvedCustomIcon,
} from '@/utils/iconLibrary';
import {
  getShortcutIconColor,
  hasOfficialIconColorOverride,
  normalizeShortcutIconColor,
  normalizeShortcutVisualMode,
} from '@/utils/shortcutIconPreferences';
import { getShortcutIconSmoothClipPathStyles } from '@/utils/shortcutIconSettings';
import {
  hexToShortcutIconHsl,
  normalizeShortcutIconHsl,
  shortcutIconHslToHex,
  type ShortcutIconHsl,
} from '@/utils/shortcutColorHsl';

const DEFAULT_SHORTCUT_ICON_COLOR = '#FFFFFF';
const PREVIEW_SIZE = 64;

type PopupShortcutComposerProps = {
  initialShortcut?: Partial<Shortcut> | null;
  title: string;
  description: ReactNode;
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  onScenarioChange: (scenarioId: string) => void;
  onCancel: () => void;
  onSave: (
    value: ShortcutDraft,
    localOnly?: {
      useCustomIcon?: boolean;
      customIconDataUrl?: string | null;
    },
  ) => void;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
};

function PopupSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-[24px] border border-border/70 bg-background/72 px-4 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <div className="mb-3 min-w-0 space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SourceChoiceButton({
  label,
  selected,
  disabled,
  badge,
  onClick,
  testId,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  badge?: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className={`min-w-0 rounded-[18px] border px-3 py-3 text-left transition-colors ${
        selected
          ? 'border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_rgba(59,130,246,0.15)]'
          : 'border-border/80 bg-secondary/30 text-muted-foreground hover:border-border hover:bg-secondary/45 hover:text-foreground'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{label}</span>
        {selected ? (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <RiCheckFill className="size-3" />
          </span>
        ) : null}
      </div>
      {badge ? <div className="mt-1.5 text-[11px] leading-4 text-muted-foreground">{badge}</div> : null}
    </button>
  );
}

function SettingToggle({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className={`flex min-w-0 items-center justify-between gap-3 rounded-[18px] border border-border/80 bg-secondary/25 px-3.5 py-3 ${disabled ? 'opacity-60' : ''}`}>
      <span className="min-w-0 text-sm font-medium leading-5 text-foreground">{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={disabled ? undefined : onCheckedChange}
        disabled={disabled}
        className="relative flex h-6 w-10 shrink-0 items-center justify-start rounded-full border border-border p-0.5 transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
      >
        <SwitchThumb className="h-full aspect-square rounded-full" pressedAnimation={{ width: 22 }} />
      </Switch>
    </div>
  );
}

export function PopupShortcutComposer({
  initialShortcut,
  title,
  description,
  scenarioModes,
  selectedScenarioId,
  onScenarioChange,
  onCancel,
  onSave,
  iconCornerRadius,
  iconAppearance,
}: PopupShortcutComposerProps) {
  const { t } = useTranslation();
  const customFileInputRef = useRef<HTMLInputElement>(null);
  const [shortcutTitle, setShortcutTitle] = useState(initialShortcut?.title || '');
  const [shortcutUrl, setShortcutUrl] = useState(initialShortcut?.url || '');
  const [useOfficialIcon, setUseOfficialIcon] = useState(false);
  const [autoUseOfficialIcon, setAutoUseOfficialIcon] = useState(true);
  const [iconRendering, setIconRendering] = useState<ShortcutVisualMode>('favicon');
  const [officialIconAvailable, setOfficialIconAvailable] = useState(false);
  const [resolvedOfficialIcon, setResolvedOfficialIcon] = useState<ResolvedCustomIcon | null>(null);
  const [userAdjustedIconSource, setUserAdjustedIconSource] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'official' | 'favicon' | 'letter' | 'custom'>('favicon');
  const [customIconDataUrl, setCustomIconDataUrl] = useState('');
  const [customIconLoading, setCustomIconLoading] = useState(false);

  const normalizedInitialColor = normalizeShortcutIconColor(initialShortcut?.iconColor);
  const defaultColorHsl = useMemo<ShortcutIconHsl>(() => (
    hexToShortcutIconHsl(DEFAULT_SHORTCUT_ICON_COLOR) ?? { hue: 0, saturation: 0, lightness: 100 }
  ), []);
  const initialTitle = initialShortcut?.title || '';
  const initialUrl = initialShortcut?.url || '';
  const initialShortcutId = typeof initialShortcut?.id === 'string' ? initialShortcut.id : '';
  const initialUseOfficialIcon = initialShortcut?.useOfficialIcon === true;
  const initialAutoUseOfficialIcon = initialShortcut?.autoUseOfficialIcon !== false;
  const initialOfficialColorOverride = hasOfficialIconColorOverride(initialShortcut);
  const initialIconRendering = normalizeShortcutVisualMode(initialShortcut?.iconRendering);
  const hasInitialExplicitColor = Boolean(normalizedInitialColor);
  const initialResolvedColorHsl = useMemo<ShortcutIconHsl>(
    () => (normalizedInitialColor ? hexToShortcutIconHsl(normalizedInitialColor) : null) ?? defaultColorHsl,
    [defaultColorHsl, normalizedInitialColor],
  );
  const initialOfficialManualColorHsl = useMemo<ShortcutIconHsl>(
    () => (initialOfficialColorOverride && hasInitialExplicitColor ? initialResolvedColorHsl : defaultColorHsl),
    [defaultColorHsl, hasInitialExplicitColor, initialOfficialColorOverride, initialResolvedColorHsl],
  );
  const initialSharedManualColorHsl = useMemo<ShortcutIconHsl>(
    () => (!initialUseOfficialIcon && hasInitialExplicitColor ? initialResolvedColorHsl : defaultColorHsl),
    [defaultColorHsl, hasInitialExplicitColor, initialResolvedColorHsl, initialUseOfficialIcon],
  );
  const initialCustomIconDataUrl = useMemo(
    () => (initialShortcutId ? readShortcutCustomIcon(initialShortcutId) : ''),
    [initialShortcutId],
  );
  const [officialColorHsl, setOfficialColorHsl] = useState<ShortcutIconHsl>(initialOfficialManualColorHsl);
  const [sharedColorHsl, setSharedColorHsl] = useState<ShortcutIconHsl>(initialSharedManualColorHsl);
  const [hasOfficialManualColorOverride, setHasOfficialManualColorOverride] = useState(initialOfficialColorOverride && hasInitialExplicitColor);
  const [hasSharedManualColorOverride, setHasSharedManualColorOverride] = useState(!initialUseOfficialIcon && hasInitialExplicitColor);
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
    setShortcutTitle(initialTitle);
    setShortcutUrl(initialUrl);
    setUseOfficialIcon(initialUseOfficialIcon);
    setAutoUseOfficialIcon(initialAutoUseOfficialIcon);
    setIconRendering(initialIconRendering);
    setOfficialIconAvailable(false);
    setResolvedOfficialIcon(null);
    setUserAdjustedIconSource(false);
    setCustomIconDataUrl(initialCustomIconDataUrl);
    setOfficialColorHsl(initialOfficialManualColorHsl);
    setSharedColorHsl(initialSharedManualColorHsl);
    setHasOfficialManualColorOverride(initialOfficialColorOverride && hasInitialExplicitColor);
    setHasSharedManualColorOverride(!initialUseOfficialIcon && hasInitialExplicitColor);
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
    hasInitialExplicitColor,
    initialAutoUseOfficialIcon,
    initialCustomIconDataUrl,
    initialIconRendering,
    initialOfficialColorOverride,
    initialOfficialManualColorHsl,
    initialSharedManualColorHsl,
    initialTitle,
    initialUrl,
    initialUseOfficialIcon,
  ]);

  const domain = useMemo(() => extractDomainFromUrl(shortcutUrl), [shortcutUrl]);
  const previewColorSeed = useMemo(
    () => (domain || shortcutUrl || shortcutTitle || '').trim().toLowerCase(),
    [domain, shortcutTitle, shortcutUrl],
  );
  const activeColorHsl = selectedSource === 'official' ? officialColorHsl : sharedColorHsl;
  const activeHasManualColorOverride = selectedSource === 'official'
    ? hasOfficialManualColorOverride
    : hasSharedManualColorOverride;
  const currentColorHex = useMemo(() => (
    shortcutIconHslToHex({
      hue: activeColorHsl.hue,
      saturation: activeColorHsl.saturation,
      lightness: activeColorHsl.lightness,
    })
  ), [activeColorHsl.hue, activeColorHsl.lightness, activeColorHsl.saturation]);
  const officialDefaultColor = useMemo(
    () => (
      resolvedOfficialIcon?.mode === 'shape-color'
        ? normalizeShortcutIconColor(resolvedOfficialIcon.defaultColor)
        : ''
    ),
    [resolvedOfficialIcon],
  );
  const displayedColorHex = useMemo(() => {
    if (activeHasManualColorOverride) {
      return getShortcutIconColor(previewColorSeed, currentColorHex);
    }
    if (selectedSource === 'official' && officialDefaultColor) {
      return officialDefaultColor;
    }
    return DEFAULT_SHORTCUT_ICON_COLOR;
  }, [activeHasManualColorOverride, currentColorHex, officialDefaultColor, previewColorSeed, selectedSource]);
  const displayedColorHsl = useMemo<ShortcutIconHsl>(
    () => {
      if (activeHasManualColorOverride) {
        return activeColorHsl;
      }
      return hexToShortcutIconHsl(displayedColorHex) ?? defaultColorHsl;
    },
    [activeColorHsl, activeHasManualColorOverride, defaultColorHsl, displayedColorHex],
  );
  const effectivePreviewColor = useMemo(
    () => {
      if (selectedSource === 'custom') return '';
      if (selectedSource === 'official') {
        if (hasOfficialManualColorOverride) {
          return getShortcutIconColor(previewColorSeed, currentColorHex);
        }
        return officialDefaultColor || '';
      }
      if (hasSharedManualColorOverride) {
        return getShortcutIconColor(previewColorSeed, currentColorHex);
      }
      return '';
    },
    [
      currentColorHex,
      hasOfficialManualColorOverride,
      hasSharedManualColorOverride,
      officialDefaultColor,
      previewColorSeed,
      selectedSource,
    ],
  );

  useEffect(() => {
    if (!domain) {
      setOfficialIconAvailable(false);
      setResolvedOfficialIcon(null);
      if (!hasExplicitIconPreference && !userAdjustedIconSource) {
        const fallbackSource = iconRendering === 'letter' ? 'letter' : 'favicon';
        setUseOfficialIcon(false);
        setSelectedSource((prev) => (prev === 'custom' ? prev : fallbackSource));
      }
      return;
    }

    let cancelled = false;
    const cachedResolved = resolveCustomIconFromCache(domain);
    const cachedAvailable = Boolean(cachedResolved?.url);
    const fallbackSource = iconRendering === 'letter' ? 'letter' : 'favicon';
    setOfficialIconAvailable(cachedAvailable);
    setResolvedOfficialIcon(cachedResolved);

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
      setResolvedOfficialIcon(available ? resolved : null);
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
  }, [domain, hasExplicitIconPreference, iconRendering, userAdjustedIconSource]);

  const globalColorEditingDisabled = typeof iconAppearance === 'string' && iconAppearance !== 'colorful';
  const colorSelectionDisabled = selectedSource === 'custom' || globalColorEditingDisabled;
  const showResetColorButton = selectedSource === 'official' && !globalColorEditingDisabled;
  const autoOfficialLocked = officialIconAvailable && selectedSource === 'official' && useOfficialIcon;
  const hasCustomIcon = Boolean(customIconDataUrl);

  const handleSave = () => {
    if (!shortcutTitle.trim() || !shortcutUrl.trim()) {
      toast.error(t('shortcutModal.errors.fillAll'), {
        description: t('shortcutModal.errors.fillAllDesc'),
      });
      return;
    }

    onSave({
      title: shortcutTitle.trim(),
      url: shortcutUrl.trim(),
      icon: initialShortcut?.icon || '',
      useOfficialIcon: officialIconAvailable ? useOfficialIcon : false,
      autoUseOfficialIcon,
      officialIconAvailableAtSave: officialIconAvailable,
      officialIconColorOverride: selectedSource === 'official' ? hasOfficialManualColorOverride : false,
      iconRendering,
      iconColor: selectedSource === 'custom'
        ? ''
        : selectedSource === 'official'
          ? (hasOfficialManualColorOverride ? normalizeShortcutIconColor(currentColorHex) : '')
          : (hasSharedManualColorOverride ? normalizeShortcutIconColor(currentColorHex) : ''),
    }, {
      useCustomIcon: selectedSource === 'custom' && Boolean(customIconDataUrl),
      customIconDataUrl: selectedSource === 'custom' ? customIconDataUrl : null,
    });
  };

  const handleSelectSource = (nextSource: 'official' | 'favicon' | 'letter') => {
    if (nextSource === 'official') {
      if (!officialIconAvailable) {
        toast.info(
          t('shortcutModal.icon.officialUnavailable', {
            defaultValue: '这个图标暂时还没有适配官方图标',
          }),
        );
        setUseOfficialIcon(false);
        return;
      }
      setUseOfficialIcon(true);
      setSelectedSource('official');
      setUserAdjustedIconSource(true);
      return;
    }

    if (nextSource === 'favicon') {
      toast.info(
        t('shortcutModal.icon.networkHint', {
          defaultValue: '网络图标可能无法获取，获取失败时会自动回退为文字图标',
        }),
      );
    }

    setUseOfficialIcon(false);
    setIconRendering(nextSource);
    setSelectedSource(nextSource);
    setUserAdjustedIconSource(true);
  };

  const handleColorSliderChange = (nextValue: Partial<ShortcutIconHsl>) => {
    if (colorSelectionDisabled) return;
    const nextColorHsl = normalizeShortcutIconHsl({
      ...(activeHasManualColorOverride ? activeColorHsl : displayedColorHsl),
      ...nextValue,
    });

    if (selectedSource === 'official') {
      setHasOfficialManualColorOverride(true);
      setOfficialColorHsl(nextColorHsl);
      return;
    }

    setHasSharedManualColorOverride(true);
    setSharedColorHsl(nextColorHsl);
  };

  const handleCustomButtonClick = () => {
    if (customIconLoading) return;

    if (hasCustomIcon && selectedSource !== 'custom') {
      setUseOfficialIcon(false);
      setSelectedSource('custom');
      setUserAdjustedIconSource(true);
      return;
    }

    if (customFileInputRef.current) {
      customFileInputRef.current.value = '';
      customFileInputRef.current.click();
    }
  };

  const handleCustomPreviewClick = () => {
    if (customIconLoading || !hasCustomIcon || !customFileInputRef.current) return;
    customFileInputRef.current.value = '';
    customFileInputRef.current.click();
  };

  const handleCustomFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCustomIconLoading(true);
    try {
      const processedDataUrl = await prepareShortcutCustomIcon(file);
      setCustomIconDataUrl(processedDataUrl);
      setUseOfficialIcon(false);
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
      url={shortcutUrl}
      shortcutId={initialShortcutId}
      localCustomIconDataUrl={selectedSource === 'custom' ? customIconDataUrl : ''}
      allowStoredCustomIcon={false}
      size={PREVIEW_SIZE}
      frame="never"
      fallbackStyle="emptyicon"
      fallbackLabel={shortcutTitle}
      useOfficialIcon={officialIconAvailable ? useOfficialIcon : false}
      autoUseOfficialIcon={autoUseOfficialIcon}
      officialIconAvailableAtSave={officialIconAvailable}
      officialIconColorOverride={selectedSource === 'official' ? hasOfficialManualColorOverride : false}
      iconRendering={iconRendering}
      iconColor={effectivePreviewColor}
      iconCornerRadius={iconCornerRadius}
      iconAppearance={iconAppearance}
    />
  );

  const previewShapeStyle = getShortcutIconSmoothClipPathStyles(iconCornerRadius);
  const canReplaceCustomPreview = selectedSource === 'custom' && hasCustomIcon;
  const hueTrackBackground = 'linear-gradient(90deg, #FF5F5F 0%, #FFB45E 16%, #F7F36A 32%, #63E281 48%, #5AD5FF 65%, #6F74FF 82%, #FF6AAE 100%)';
  const saturationTrackBackground = `linear-gradient(90deg, hsl(${displayedColorHsl.hue}, 0%, 50%), hsl(${displayedColorHsl.hue}, 100%, 50%))`;
  const lightnessTrackBackground = 'linear-gradient(90deg, #09090B 0%, #FFFFFF 100%)';

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[30px] border border-border/70 bg-background/86 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl">
      <div className="border-b border-border/60 px-4 pb-4 pt-4">
        <div className="space-y-1">
          <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-foreground">{title}</h1>
          <div className="text-[13px] leading-5 text-muted-foreground">{description}</div>
        </div>
      </div>

      <div className="no-scrollbar flex max-h-[min(720px,calc(100vh-24px))] min-h-0 flex-col gap-4 overflow-y-auto px-4 py-4">
        <PopupSection
          title={t('popupShortcut.previewSectionTitle', { defaultValue: '快捷方式预览' })}
          description={t('popupShortcut.previewSectionDesc', { defaultValue: '在这里确认标题、网址和图标效果，保存后会直接加入当前情景模式。' })}
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="shrink-0">
              {canReplaceCustomPreview ? (
                <button
                  type="button"
                  onClick={handleCustomPreviewClick}
                  disabled={customIconLoading}
                  data-testid="shortcut-custom-preview-trigger"
                  aria-label={t('shortcutModal.icon.modeCustomReplaceShort', { defaultValue: '更改' })}
                  className="group relative inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  style={previewShapeStyle}
                >
                  {previewNode}
                  <span
                    className="pointer-events-none absolute inset-0 flex items-end justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/28 group-hover:opacity-100 group-focus-visible:bg-black/28 group-focus-visible:opacity-100"
                    style={previewShapeStyle}
                  >
                    <span className="mb-1.5 flex size-8 items-center justify-center rounded-full bg-black/45 text-white shadow-sm">
                      <RiPencilFill className="size-4" />
                    </span>
                  </span>
                </button>
              ) : (
                <div style={previewShapeStyle}>{previewNode}</div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="truncate text-sm font-semibold text-foreground">
                {shortcutTitle.trim() || t('shortcutModal.namePlaceholder')}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {shortcutUrl.trim() || t('shortcutModal.urlPlaceholder')}
              </div>
              <div className="truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground/80">
                {domain || t('popupShortcut.previewWaiting', { defaultValue: '等待输入网址' })}
              </div>
            </div>
          </div>
        </PopupSection>

        <PopupSection
          title={t('popupShortcut.infoSectionTitle', { defaultValue: '基础信息' })}
          description={t('popupShortcut.infoSectionDesc', { defaultValue: '这里用更紧凑的单列布局，避免 popup 在小窗口里横向被撑开。' })}
        >
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="px-1 text-xs font-medium text-muted-foreground">
                {t('shortcutModal.namePlaceholder')}
              </span>
              <input
                id="shortcut-title"
                data-testid="shortcut-modal-title"
                type="text"
                value={shortcutTitle}
                onChange={(event) => setShortcutTitle(event.target.value)}
                placeholder={t('shortcutModal.namePlaceholder')}
                className="h-11 w-full min-w-0 rounded-[18px] border border-border/80 bg-secondary/20 px-3.5 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/65 focus:border-primary"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="px-1 text-xs font-medium text-muted-foreground">
                {t('shortcutModal.urlPlaceholder')}
              </span>
              <input
                id="shortcut-url"
                data-testid="shortcut-modal-url"
                type="text"
                value={shortcutUrl}
                onChange={(event) => setShortcutUrl(event.target.value)}
                placeholder={t('shortcutModal.urlPlaceholder')}
                className="h-11 w-full min-w-0 rounded-[18px] border border-border/80 bg-secondary/20 px-3.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/65 focus:border-primary"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="px-1 text-xs font-medium text-muted-foreground">
                {t('popupShortcut.scenarioLabel', { defaultValue: '保存到情景模式' })}
              </span>
              <select
                data-testid="popup-scenario-select"
                value={selectedScenarioId}
                onChange={(event) => onScenarioChange(event.target.value)}
                className="h-11 w-full min-w-0 rounded-[18px] border border-border/80 bg-secondary/20 px-3.5 text-[14px] text-foreground outline-none transition-colors focus:border-primary"
              >
                {scenarioModes.length === 0 ? (
                  <option value="">
                    {t('popupShortcut.scenarioPlaceholder', {
                      defaultValue: '选择情景模式',
                    })}
                  </option>
                ) : null}
                {scenarioModes.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </PopupSection>

        <PopupSection
          title={t('shortcutModal.icon.modeGroup', { defaultValue: '图标来源' })}
          description={t('popupShortcut.iconSectionDesc', { defaultValue: '把原来一排四个按钮改成两列卡片，窄窗口下不会再挤压变形。' })}
        >
          <div className="grid min-w-0 grid-cols-2 gap-2">
            <SourceChoiceButton
              label={t('shortcutModal.icon.modeOfficialShort', { defaultValue: '官方' })}
              badge={officialIconAvailable ? t('popupShortcut.iconOfficialReady', { defaultValue: '已匹配' }) : t('popupShortcut.iconOfficialWaiting', { defaultValue: '未适配' })}
              selected={selectedSource === 'official'}
              onClick={() => handleSelectSource('official')}
              testId="shortcut-icon-mode-official"
            />
            <SourceChoiceButton
              label={t('shortcutModal.icon.modeFaviconShort', { defaultValue: '网络' })}
              selected={selectedSource === 'favicon'}
              onClick={() => handleSelectSource('favicon')}
              testId="shortcut-icon-mode-favicon"
            />
            <SourceChoiceButton
              label={t('shortcutModal.icon.modeLetterShort', { defaultValue: '文字' })}
              selected={selectedSource === 'letter'}
              onClick={() => handleSelectSource('letter')}
              testId="shortcut-icon-mode-letter"
            />
            <SourceChoiceButton
              label={customIconLoading
                ? t('shortcutModal.icon.modeCustomLoadingShort', { defaultValue: '处理中' })
                : t('shortcutModal.icon.modeCustomShort', { defaultValue: '自定义' })}
              badge={hasCustomIcon ? t('popupShortcut.iconCustomReady', { defaultValue: '已导入' }) : undefined}
              selected={selectedSource === 'custom'}
              disabled={customIconLoading}
              onClick={handleCustomButtonClick}
              testId="shortcut-icon-mode-custom"
            />
          </div>

          <input
            ref={customFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCustomFileChange}
          />

          <div className="mt-3">
            <SettingToggle
              label={t('shortcutModal.icon.autoOfficial', { defaultValue: '适配后自动切换官方图标' })}
              checked={autoOfficialLocked ? true : autoUseOfficialIcon}
              disabled={autoOfficialLocked}
              onCheckedChange={setAutoUseOfficialIcon}
            />
          </div>
        </PopupSection>

        <PopupSection
          title={t('popupShortcut.colorSectionTitle', { defaultValue: '颜色调整' })}
          description={colorSelectionDisabled
            ? t('popupShortcut.colorSectionDisabled', { defaultValue: '当前图标来源不支持调色，切换到官方 / 网络 / 文字图标后即可调整。' })
            : t('popupShortcut.colorSectionReady', { defaultValue: '拖动滑杆微调图标观感，布局已经压缩为适合 popup 的高度。' })}
        >
          <div className="space-y-2.5">
            {showResetColorButton ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setHasOfficialManualColorOverride(false)}
                  data-testid="shortcut-color-reset"
                  className="rounded-full border border-border bg-secondary/35 px-3 py-1 text-[12px] font-medium text-foreground transition-colors hover:bg-secondary/55"
                >
                  {t('shortcutModal.icon.resetColor', { defaultValue: '重置' })}
                </button>
              </div>
            ) : null}

            <ShortcutColorSlider
              label={t('shortcutModal.icon.hue', { defaultValue: '色相' })}
              value={displayedColorHsl.hue}
              min={0}
              max={360}
              background={hueTrackBackground}
              thumbColor={displayedColorHex}
              disabled={colorSelectionDisabled}
              compact
              testId="shortcut-color-slider-hue"
              onChange={(value) => handleColorSliderChange({ hue: value })}
            />
            <ShortcutColorSlider
              label={t('shortcutModal.icon.saturation', { defaultValue: '饱和度' })}
              value={displayedColorHsl.saturation}
              min={0}
              max={100}
              background={saturationTrackBackground}
              thumbColor={displayedColorHex}
              disabled={colorSelectionDisabled}
              compact
              testId="shortcut-color-slider-saturation"
              onChange={(value) => handleColorSliderChange({ saturation: value })}
            />
            <ShortcutColorSlider
              label={t('shortcutModal.icon.brightness', { defaultValue: '亮度' })}
              value={displayedColorHsl.lightness}
              min={0}
              max={100}
              background={lightnessTrackBackground}
              thumbColor={displayedColorHex}
              disabled={colorSelectionDisabled}
              compact
              testId="shortcut-color-slider-brightness"
              onChange={(value) => handleColorSliderChange({ lightness: value })}
            />
          </div>
        </PopupSection>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border/60 px-4 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-testid="shortcut-modal-cancel"
          className="h-11 rounded-[18px]"
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          data-testid="shortcut-modal-save"
          className="h-11 rounded-[18px]"
        >
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
