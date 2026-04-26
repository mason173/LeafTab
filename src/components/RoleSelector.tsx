import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { useWallpaperBackdropSnapshot } from '@/components/wallpaper/WallpaperBackdropContext';
import { OnboardingAppearanceStep } from '@/components/onboarding/OnboardingAppearanceStep';
import { OnboardingRoleStep } from '@/components/onboarding/OnboardingRoleStep';
import {
  RiArrowLeftSLine,
  RiBankFill,
  RiBriefcase4Fill,
  RiCodeSSlashFill,
  RiFolderChartFill,
  RiGraduationCapFill,
  RiMegaphoneFill,
  RiPaletteFill,
  RiTeamFill,
} from '@/icons/ri-compat';
import {
  DEFAULT_WALLPAPER_ACCENT_PALETTE,
  resolveWallpaperAccentPalette,
} from '@/utils/dynamicAccentColor';
import type { DisplayMode } from '@/displayMode/config';
import type { WallpaperMode } from '@/wallpaper/types';
import defaultWallpaperImage from '@/assets/Default_wallpaper.webp?url';
import { getColorWallpaperGradient } from '@/components/wallpaper/colorWallpapers';
import {
  ADAPTIVE_NEUTRAL_ACCENT,
  DEFAULT_ACCENT_COLOR,
  getWallpaperAccentSlotKey,
  resolveAccentDetailColor,
  resolveAdaptiveNeutralAccent,
} from '@/utils/accentColor';

interface RoleSelectorProps {
  open: boolean;
  onSelect: (roleId: string, displayMode?: DisplayMode) => void;
  wallpaperMode: WallpaperMode;
  bingWallpaper: string;
  customWallpaper: string | null;
  weatherCode: number;
  colorWallpaperId: string;
  dynamicWallpaperSrc?: string;
}

const STEP_ORDER = ['appearance', 'role'] as const;
type StepType = (typeof STEP_ORDER)[number];

export function RoleSelector({
  open,
  onSelect,
  wallpaperMode,
  bingWallpaper,
  customWallpaper,
  weatherCode,
  colorWallpaperId,
  dynamicWallpaperSrc,
}: RoleSelectorProps) {
  const wallpaperBackdrop = useWallpaperBackdropSnapshot();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [accentColor, setAccentColor] = useState<string>(DEFAULT_ACCENT_COLOR);
  const [recommendedAccentPalette, setRecommendedAccentPalette] = useState<string[]>(DEFAULT_WALLPAPER_ACCENT_PALETTE);
  const [step, setStep] = useState<StepType>('appearance');
  const { i18n, t } = useTranslation();
  const { setTheme, resolvedTheme } = useTheme();

  const roleOptions = [
    {
      id: 'programmer',
      title: t('roles.programmer'),
      icon: RiCodeSSlashFill,
    },
    {
      id: 'product_manager',
      title: t('roles.product_manager'),
      icon: RiBriefcase4Fill,
    },
    {
      id: 'designer',
      title: t('roles.designer'),
      icon: RiPaletteFill,
    },
    {
      id: 'student',
      title: t('roles.student'),
      icon: RiGraduationCapFill,
    },
    {
      id: 'marketer',
      title: t('roles.marketer'),
      icon: RiMegaphoneFill,
    },
    {
      id: 'finance',
      title: t('roles.finance'),
      icon: RiBankFill,
    },
    {
      id: 'hr',
      title: t('roles.hr'),
      icon: RiTeamFill,
    },
    {
      id: 'admin',
      title: t('roles.admin'),
      icon: RiFolderChartFill,
    },
  ];

  const visibleSteps = STEP_ORDER;

  const handleLanguageSelect = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  const completeOnboarding = () => {
    if (!selectedRole) return;
    const role = roleOptions.find((item) => item.id === selectedRole);
    if (!role) return;
    onSelect(role.id, 'fresh');
  };

  const handleThemeSelect = (theme: 'light' | 'dark' | 'system') => {
    setSelectedTheme(theme);
    setTheme(theme);
  };

  const isDarkTheme = resolvedTheme === 'dark';
  const colorOptions = useMemo(() => {
    const recommendedOptions = Array.from({ length: 6 }, (_, index) => ({
      name: getWallpaperAccentSlotKey(index),
      value: recommendedAccentPalette[index] || DEFAULT_WALLPAPER_ACCENT_PALETTE[index],
      accentDetailColor: resolveAccentDetailColor(recommendedAccentPalette[index] || DEFAULT_WALLPAPER_ACCENT_PALETTE[index]),
      label: t('settings.accent.recommended', {
        index: index + 1,
        defaultValue: `Recommended ${index + 1}`,
      }),
    }));

    return [
      ...recommendedOptions,
      {
        name: ADAPTIVE_NEUTRAL_ACCENT,
        value: resolveAdaptiveNeutralAccent(isDarkTheme),
        accentDetailColor: resolveAccentDetailColor(resolveAdaptiveNeutralAccent(isDarkTheme)),
        label: t('settings.accent.adaptiveNeutral', {
          defaultValue: 'Adaptive neutral',
        }),
      },
    ];
  }, [isDarkTheme, recommendedAccentPalette, t]);

  useEffect(() => {
    const stored = localStorage.getItem('accentColor');
    const savedColor = stored || DEFAULT_ACCENT_COLOR;
    setAccentColor(savedColor);
    if (!stored) {
      localStorage.setItem('accentColor', savedColor);
      window.dispatchEvent(new Event('leaftab-accent-color-changed'));
    }
  }, []);

  useEffect(() => {
    let canceled = false;

    resolveWallpaperAccentPalette({
      wallpaperMode,
      bingWallpaper,
      customWallpaper,
      weatherCode,
      colorWallpaperId,
      dynamicWallpaperSrc,
    })
      .then((palette) => {
        if (canceled) return;
        setRecommendedAccentPalette(
          palette.length >= 6
            ? palette.slice(0, 6)
            : [...palette, ...DEFAULT_WALLPAPER_ACCENT_PALETTE].slice(0, 6),
        );
      })
      .catch(() => {
        if (canceled) return;
        setRecommendedAccentPalette(DEFAULT_WALLPAPER_ACCENT_PALETTE);
      });

    return () => {
      canceled = true;
    };
  }, [bingWallpaper, colorWallpaperId, customWallpaper, dynamicWallpaperSrc, wallpaperMode, weatherCode]);

  useEffect(() => {
    if (!open) return;
    setStep((current) => (visibleSteps.includes(current) ? current : 'appearance'));
  }, [open]);

  const handleColorChange = (colorName: string) => {
    setAccentColor(colorName);
    localStorage.setItem('accentColor', colorName);
    window.dispatchEvent(new Event('leaftab-accent-color-changed'));
  };

  const LANGUAGES = [
    { code: 'zh', label: t('languages.zh') },
    { code: 'en', label: t('languages.en') },
    { code: 'ja', label: t('languages.ja') },
    { code: 'ko', label: t('languages.ko') },
    { code: 'vi', label: t('languages.vi') },
    { code: 'zh-TW', label: t('languages.zh-TW') },
  ];

  if (!open) {
    return null;
  }

  const normalizedLanguage = i18n.language === 'zh-CN' ? 'zh' : i18n.language;
  const currentStepIndex = visibleSteps.indexOf(step);
  const fallbackWallpaperImageSrc = wallpaperMode === 'custom'
    ? (customWallpaper || bingWallpaper || defaultWallpaperImage)
    : wallpaperMode === 'bing' || wallpaperMode === 'dynamic'
      ? (bingWallpaper || defaultWallpaperImage)
      : defaultWallpaperImage;
  const wallpaperFallbackGradient = wallpaperMode === 'color'
    ? getColorWallpaperGradient(colorWallpaperId)
    : '';
  const effectiveWallpaperMaskOpacity = wallpaperBackdrop?.effectiveWallpaperMaskOpacity ?? 10;
  const modeOverlayStyle = resolvedTheme === 'dark'
    ? { backgroundColor: 'rgba(0, 0, 0, 0.74)' }
    : { backgroundColor: 'rgba(255, 255, 255, 0.9)' };

  const goToStep = (nextStep: StepType) => {
    if (!visibleSteps.includes(nextStep)) return;
    setStep(nextStep);
  };

  const appearanceStepDots = visibleSteps.map((item, index) => ({
    id: item,
    active: currentStepIndex === index,
    onClick: () => goToStep(item),
  }));

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden bg-black/0 text-foreground dark:bg-black/16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {wallpaperBackdrop?.blurredWallpaperSrc ? (
          <img
            src={wallpaperBackdrop.blurredWallpaperSrc}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : wallpaperFallbackGradient ? (
          <div
            className="absolute inset-0"
            style={{ backgroundImage: wallpaperFallbackGradient }}
          />
        ) : (
          <img
            src={fallbackWallpaperImageSrc}
            alt=""
            draggable={false}
            className="absolute inset-[-6%] h-[112%] w-[112%] max-w-none object-cover blur-[32px] saturate-[1.08]"
          />
        )}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0, 0, 0, ${Math.max(0, Math.min(100, effectiveWallpaperMaskOpacity)) / 100})` }}
        />
        <div className="absolute inset-0" style={modeOverlayStyle} />
      </div>

      <div
        className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden px-6 py-6"
        data-frosted-ui-scope
      >
        {step === 'role' ? (
          <div className="pointer-events-none absolute inset-0">
            <div className="pointer-events-auto absolute top-6 left-6 sm:top-8 sm:left-8">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/60 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-0"
                onClick={() => goToStep('appearance')}
                aria-label={t('common.back', { defaultValue: 'Back' })}
              >
                <RiArrowLeftSLine className="size-5" />
              </button>
            </div>
          </div>
        ) : null}

        <div className="h-full max-h-[calc(100vh-48px)] w-full max-w-[880px] overflow-hidden px-1 py-1 sm:px-2 sm:py-2 md:px-3 md:py-3">
          <div className="h-full overflow-y-auto overflow-x-hidden p-6 sm:p-6 md:p-7">
            {step === 'appearance' ? (
              <OnboardingAppearanceStep
                currentTheme={selectedTheme}
                currentAccentColor={accentColor}
                currentLanguage={normalizedLanguage}
                accentOptions={colorOptions}
                languageOptions={LANGUAGES}
                stepDots={appearanceStepDots}
                onAccentColorChange={handleColorChange}
                onLanguageChange={handleLanguageSelect}
                onNext={() => goToStep('role')}
                onThemeChange={handleThemeSelect}
              />
            ) : (
              <OnboardingRoleStep
                roleOptions={roleOptions}
                selectedRole={selectedRole}
                stepDots={appearanceStepDots}
                onNext={completeOnboarding}
                nextLabel={t('onboarding.enterHome')}
                onRoleSelect={setSelectedRole}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
