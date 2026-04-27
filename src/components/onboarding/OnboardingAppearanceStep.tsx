import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/components/ui/utils';
import {
  RiArrowRightSLine,
  RiCheckFill,
  RiComputerFill,
  RiMoonFill,
  RiSunFill,
} from '@/icons/ri-compat';

type ThemeMode = 'light' | 'dark' | 'system';

type AccentOption = {
  name: string;
  value: string;
  accentDetailColor: string;
  label: string;
};

type LanguageOption = {
  code: string;
  label: string;
};

type StepDot = {
  id: string;
  active: boolean;
  onClick: () => void;
};

type OnboardingAppearanceStepProps = {
  currentTheme: ThemeMode;
  currentAccentColor: string;
  currentLanguage: string;
  accentOptions: readonly AccentOption[];
  languageOptions: readonly LanguageOption[];
  stepDots: readonly StepDot[];
  onAccentColorChange: (colorName: string) => void;
  onLanguageChange: (lang: string) => void;
  onNext: () => void;
  onThemeChange: (theme: ThemeMode) => void;
};

const THEME_ICON_CLASSNAME = 'size-4.5 shrink-0';

function renderThemeModeIcon(mode: ThemeMode) {
  if (mode === 'light') return <RiSunFill className={THEME_ICON_CLASSNAME} />;
  if (mode === 'dark') return <RiMoonFill className={THEME_ICON_CLASSNAME} />;
  return <RiComputerFill className={THEME_ICON_CLASSNAME} />;
}

export function OnboardingAppearanceStep({
  currentTheme,
  currentAccentColor,
  currentLanguage,
  accentOptions,
  languageOptions,
  stepDots,
  onAccentColorChange,
  onLanguageChange,
  onNext,
  onThemeChange,
}: OnboardingAppearanceStepProps) {
  const { t } = useTranslation();
  const themeOptions = [
    { value: 'system' as const, label: t('settings.theme.system') },
    { value: 'dark' as const, label: t('settings.theme.dark') },
    { value: 'light' as const, label: t('settings.theme.light') },
  ];

  return (
    <div className="mx-auto flex min-h-[clamp(520px,72vh,680px)] w-full max-w-[760px] flex-col items-center justify-center gap-8 py-8 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-[-0.03em] sm:text-5xl md:whitespace-nowrap">
          欢迎使用LeafTab 新标签页
        </h1>
        <p className="mx-auto max-w-[560px] text-base text-muted-foreground sm:text-[17px]">
          Minimal by Design. Powerful in Use.
        </p>
        <p className="mx-auto max-w-[560px] text-sm tracking-[0.18em] text-foreground/60 uppercase">
          开源 • 端到端加密 • WebDAV 同步
        </p>
      </div>

      <section className="flex w-full max-w-[360px] flex-col items-center space-y-3">
        <div className="text-center text-sm font-medium text-foreground/78">
          {t('settings.theme.label')}
        </div>
        <div
          className="frosted-control-surface inline-flex h-12 max-w-full items-center gap-1 rounded-full p-1"
          role="radiogroup"
          aria-label={t('settings.theme.label')}
        >
          {themeOptions.map((option) => {
            const selected = currentTheme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={option.label}
                title={option.label}
                className={cn(
                  'inline-flex h-full min-w-11 items-center justify-center rounded-full px-3 transition-all focus:outline-none focus-visible:ring-0',
                  selected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground/60 hover:bg-background/50 hover:text-foreground',
                )}
                onClick={() => onThemeChange(option.value)}
              >
                {renderThemeModeIcon(option.value)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex w-full flex-col items-center space-y-3">
        <div className="text-center text-sm font-medium text-foreground/78">
          {t('settings.accentColor.label')}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {accentOptions.map((option) => (
            <button
              key={option.name}
              type="button"
              onClick={() => onAccentColorChange(option.name)}
              className={cn(
                'relative flex size-10 appearance-none items-center justify-center overflow-hidden rounded-full border-none outline-none ring-0 shadow-none transition-transform focus:outline-none focus-visible:outline-none focus-visible:ring-0',
                currentAccentColor === option.name ? 'scale-105 brightness-[1.02]' : 'hover:scale-[1.04]',
              )}
              style={{ backgroundColor: option.value, border: 'none', boxShadow: 'none' }}
              aria-label={option.label}
            >
              {currentAccentColor === option.name ? (
                <RiCheckFill
                  className="size-5 stroke-[3]"
                  style={{ color: option.accentDetailColor }}
                />
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <div className="flex w-full flex-col items-center space-y-6">
        <div className="w-full max-w-[360px] space-y-2">
          <div className="text-center text-sm font-medium text-foreground/78">
            {t('settings.language.label')}
          </div>
          <Select value={currentLanguage} onValueChange={onLanguageChange}>
            <SelectTrigger className="frosted-control-surface h-12 border-border text-base text-foreground shadow-none">
              <SelectValue placeholder={t('settings.language.selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent
              portalled={false}
              className="z-[260] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] border-border text-popover-foreground shadow-[0_16px_44px_rgba(8,12,18,0.18)]"
            >
              {languageOptions.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-center gap-2">
          {stepDots.map((dot, index) => (
            <button
              key={dot.id}
              type="button"
              onClick={dot.onClick}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                dot.active ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/40',
              )}
              aria-label={`step-${index + 1}`}
            />
          ))}
        </div>

        <div className="flex h-12 items-center justify-center">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-base font-medium text-foreground/70 transition-colors hover:text-foreground"
            onClick={onNext}
          >
            <span>{t('onboarding.next')}</span>
            <RiArrowRightSLine className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
