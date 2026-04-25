
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { useTranslation } from 'react-i18next';
import {
  RiArrowLeftSLine,
  RiBankFill,
  RiBookOpenFill,
  RiBriefcase4Fill,
  RiCheckFill,
  RiCheckboxBlankFill,
  RiCodeSSlashFill,
  RiComputerFill,
  RiFlashlightFill,
  RiFolderChartFill,
  RiGraduationCapFill,
  RiHistoryFill,
  RiMegaphoneFill,
  RiMoonFill,
  RiPaletteFill,
  RiSunFill,
  RiTeamFill,
} from '@/icons/ri-compat';
import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import {
  DEFAULT_WALLPAPER_ACCENT_PALETTE,
  resolveWallpaperAccentPalette,
} from "@/utils/dynamicAccentColor";
import { DISPLAY_MODE_OPTIONS, type DisplayMode } from "@/displayMode/config";
import { ensureExtensionPermission } from '@/utils/extensionPermissions';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import { getExtensionPermissionSupport } from '@/platform/permissions';
import type { WallpaperMode } from '@/wallpaper/types';
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
}

const STEP_ORDER = ['appearance', 'role', 'layout', 'permissions'] as const;
type StepType = (typeof STEP_ORDER)[number];
type OnboardingPermission = 'history' | 'bookmarks' | 'tabs';

export function RoleSelector({
  open,
  onSelect,
  wallpaperMode,
  bingWallpaper,
  customWallpaper,
  weatherCode,
  colorWallpaperId,
}: RoleSelectorProps) {
  const firefox = isFirefoxBuildTarget();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<DisplayMode>('fresh');
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [accentColor, setAccentColor] = useState<string>(DEFAULT_ACCENT_COLOR);
  const [recommendedAccentPalette, setRecommendedAccentPalette] = useState<string[]>(DEFAULT_WALLPAPER_ACCENT_PALETTE);
  const [step, setStep] = useState<StepType>('appearance');
  const [direction, setDirection] = useState(1);
  const [appearanceRevealReady, setAppearanceRevealReady] = useState(false);
  const [grantedPermissions, setGrantedPermissions] = useState<Record<OnboardingPermission, boolean>>({
    history: false,
    bookmarks: false,
    tabs: false,
  });
  const [permissionRequesting, setPermissionRequesting] = useState<OnboardingPermission | null>(null);
  const previousStepRef = useRef<StepType | null>(null);
  const stepRevealTimerRef = useRef<number | null>(null);
  const { i18n, t } = useTranslation();
  const { setTheme, resolvedTheme } = useTheme();
  const stagedRevealHidden = useMemo(
    () => (firefox ? { opacity: 0, y: 16 } : { opacity: 0, y: 20, filter: "blur(12px)" }),
    [firefox],
  );
  const stagedRevealShown = useMemo(
    () => (firefox ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, filter: "blur(0px)" }),
    [firefox],
  );
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
    }
  ];
  const permissionSupport = useMemo(
    () => ({
      history: getExtensionPermissionSupport('history'),
      bookmarks: getExtensionPermissionSupport('bookmarks'),
      tabs: getExtensionPermissionSupport('tabs'),
    }),
    [],
  );
  const permissionCards = useMemo(
    () => [
      {
        id: 'history' as const,
        title: t('onboarding.historyPermissionTitle'),
        description: t('onboarding.historyPermissionDesc'),
        icon: RiHistoryFill,
      },
      {
        id: 'bookmarks' as const,
        title: t('onboarding.bookmarksPermissionTitle'),
        description: t('onboarding.bookmarksPermissionDesc'),
        icon: RiBookOpenFill,
      },
      {
        id: 'tabs' as const,
        title: t('onboarding.tabsPermissionTitle'),
        description: t('onboarding.tabsPermissionDesc'),
        icon: RiComputerFill,
      },
    ],
    [t],
  );
  const showPermissionsStep = useMemo(
    () => Object.values(permissionSupport).some((support) => support !== 'granted'),
    [permissionSupport],
  );
  const visibleSteps = useMemo<readonly StepType[]>(
    () => (showPermissionsStep ? STEP_ORDER : STEP_ORDER.filter((stepItem) => stepItem !== 'permissions')),
    [showPermissionsStep],
  );

  const handleLanguageSelect = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  const completeOnboarding = () => {
    if (selectedRole) {
      const role = roleOptions.find(r => r.id === selectedRole);
      if (role) {
        onSelect(role.id, selectedLayout);
      }
    }
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
  }, [bingWallpaper, colorWallpaperId, customWallpaper, wallpaperMode, weatherCode]);

  const handleColorChange = (colorName: string) => {
    setAccentColor(colorName);
    localStorage.setItem('accentColor', colorName);
    window.dispatchEvent(new Event('leaftab-accent-color-changed'));
  };

  useEffect(() => {
    if (stepRevealTimerRef.current) {
      window.clearTimeout(stepRevealTimerRef.current);
      stepRevealTimerRef.current = null;
    }

    if (!open) {
      setAppearanceRevealReady(false);
      previousStepRef.current = null;
      setPermissionRequesting(null);
      return;
    }

    const previousStep = previousStepRef.current;
    const switchedStep = previousStep !== null && previousStep !== step;
    const revealDelay = switchedStep ? 340 : 40;

    if (step === 'appearance') {
      setAppearanceRevealReady(false);
      stepRevealTimerRef.current = window.setTimeout(() => {
        setAppearanceRevealReady(true);
        stepRevealTimerRef.current = null;
      }, revealDelay);
    } else {
      setAppearanceRevealReady(false);
    }

    previousStepRef.current = step;

    return () => {
      if (stepRevealTimerRef.current) {
        window.clearTimeout(stepRevealTimerRef.current);
        stepRevealTimerRef.current = null;
      }
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    void Promise.all([
      ensureExtensionPermission('history', { requestIfNeeded: false }).catch(() => false),
      ensureExtensionPermission('bookmarks', { requestIfNeeded: false }).catch(() => false),
      ensureExtensionPermission('tabs', { requestIfNeeded: false }).catch(() => false),
    ]).then(([historyGranted, bookmarksGranted, tabsGranted]) => {
      if (cancelled) return;
      setGrantedPermissions({
        history: historyGranted,
        bookmarks: bookmarksGranted,
        tabs: tabsGranted,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (showPermissionsStep) return;
    setStep((current) => (current === 'permissions' ? 'layout' : current));
  }, [open, showPermissionsStep]);

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
  const allPermissionsGranted = grantedPermissions.history && grantedPermissions.bookmarks && grantedPermissions.tabs;
  const canAccessStep = (targetStep: StepType) => {
    if (!visibleSteps.includes(targetStep)) return false;
    if (targetStep === 'appearance' || targetStep === 'role') return true;
    return Boolean(selectedRole);
  };

  const goToStep = (nextStep: StepType) => {
    if (!canAccessStep(nextStep)) return;
    const nextIndex = visibleSteps.indexOf(nextStep);
    setDirection(nextIndex > currentStepIndex ? 1 : -1);
    setStep(nextStep);
  };

  const handleRequestPermission = async (permission: OnboardingPermission) => {
    if (permissionRequesting === permission) return;
    if (permissionSupport[permission] === 'unsupported') return;

    setPermissionRequesting(permission);
    const granted = await ensureExtensionPermission(permission, { requestIfNeeded: true }).catch(() => false);
    setGrantedPermissions((current) => ({
      ...current,
      [permission]: current[permission] || granted,
    }));
    setPermissionRequesting((current) => (current === permission ? null : current));
  };

  const renderLayoutPreview = (mode: DisplayMode) => {
    if (mode === 'fresh') {
      return (
        <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center p-4 gap-2">
          <RiFlashlightFill className="w-9 h-9 text-foreground/50" />
          <div className="w-3/4 h-2 bg-foreground/10 rounded-full"></div>
          <div className="w-1/2 h-2 bg-foreground/10 rounded-full"></div>
        </div>
      );
    }
    return (
      <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center p-4">
        <RiCheckboxBlankFill className="w-9 h-9 text-foreground/50 mb-2" />
        <div className="w-1/2 h-2 bg-foreground/10 rounded-full"></div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-[rgba(18,22,30,0.82)] text-foreground supports-[backdrop-filter]:bg-[rgba(18,22,30,0.68)] supports-[backdrop-filter]:backdrop-blur-xl">
      <div className="min-h-screen w-full flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[800px]">
          <div className="overflow-hidden">
            <AnimatePresence initial={false} mode="wait" custom={direction}>
              {step === 'appearance' && (
                <motion.div
                  key="appearance"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  className="space-y-10"
                >
              <motion.div
                className="text-center space-y-2"
                initial={false}
                animate={appearanceRevealReady ? stagedRevealShown : stagedRevealHidden}
                transition={{ duration: 0.32, ease: "easeOut", delay: 0.02 }}
              >
                <TextEffect
                  as="h1"
                  className="text-4xl font-bold"
                  per="char"
                  preset="fade-in-blur"
                  speedReveal={1.15}
                >
                  {t('onboarding.stepAppearanceTitle')}
                </TextEffect>
                <TextEffect
                  className="text-muted-foreground text-base"
                  per="word"
                  preset="fade-in-blur"
                  delay={0.16}
                  speedReveal={1.1}
                >
                  {t('onboarding.stepAppearanceDesc')}
                </TextEffect>
              </motion.div>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full"
                initial={false}
                animate={appearanceRevealReady ? stagedRevealShown : stagedRevealHidden}
                transition={{ duration: 0.34, ease: "easeOut", delay: 0.14 }}
              >
                <button
                  type="button"
                  className={cn(
                    "no-pill-radius cursor-pointer !rounded-[28px] border-2 p-3 transition-all flex flex-col items-center gap-2 text-center",
                    selectedTheme === 'system' ? "border-primary bg-card" : "border-muted bg-card"
                  )}
                  onClick={() => handleThemeSelect('system')}
                >
                  <div className="w-full aspect-[16/8] bg-muted rounded-[22px] flex items-center justify-center overflow-hidden">
                    <RiComputerFill className="w-7 h-7 text-foreground/70" />
                  </div>
                  <div className="w-full flex items-center justify-center">
                    <div className="w-full text-center font-semibold text-base">{t('settings.theme.system')}</div>
                  </div>
                </button>

                <button
                  type="button"
                  className={cn(
                    "no-pill-radius cursor-pointer !rounded-[28px] border-2 p-3 transition-all flex flex-col items-center gap-2 text-center",
                    selectedTheme === 'dark' ? "border-primary bg-card" : "border-muted bg-card"
                  )}
                  onClick={() => handleThemeSelect('dark')}
                >
                  <div className="w-full aspect-[16/8] bg-muted rounded-[22px] flex items-center justify-center overflow-hidden">
                    <RiMoonFill className="w-7 h-7 text-foreground/70" />
                  </div>
                  <div className="w-full flex items-center justify-center">
                    <div className="w-full text-center font-semibold text-base">{t('settings.theme.dark')}</div>
                  </div>
                </button>

                <button
                  type="button"
                  className={cn(
                    "no-pill-radius cursor-pointer !rounded-[28px] border-2 p-3 transition-all flex flex-col items-center gap-2 text-center",
                    selectedTheme === 'light' ? "border-primary bg-card" : "border-muted bg-card"
                  )}
                  onClick={() => handleThemeSelect('light')}
                >
                  <div className="w-full aspect-[16/8] bg-muted rounded-[22px] flex items-center justify-center overflow-hidden">
                    <RiSunFill className="w-7 h-7 text-foreground/70" />
                  </div>
                  <div className="w-full flex items-center justify-center">
                    <div className="w-full text-center font-semibold text-base">{t('settings.theme.light')}</div>
                  </div>
                </button>
              </motion.div>

              <motion.div
                className="w-full"
                initial={false}
                animate={appearanceRevealReady ? stagedRevealShown : stagedRevealHidden}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.26 }}
              >
                <div className="flex items-center justify-center w-full px-[6px] gap-3 flex-wrap">
                  {colorOptions.map((option) => (
                    <button
                      key={option.name}
                      onClick={() => handleColorChange(option.name)}
                      className={`relative flex size-10 items-center justify-center rounded-full overflow-hidden border transition-transform ${accentColor === option.name ? 'scale-105' : 'hover:scale-[1.04]'}`}
                      style={{ backgroundColor: option.value, borderColor: option.accentDetailColor }}
                      aria-label={option.label}
                    >
                      {accentColor === option.name ? (
                        <RiCheckFill
                          className="size-5 stroke-[3]"
                          style={{ color: option.accentDetailColor }}
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="w-full space-y-2"
                initial={false}
                animate={appearanceRevealReady ? stagedRevealShown : stagedRevealHidden}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.38 }}
              >
                <div className="text-left text-xs text-muted-foreground">{t('settings.language.label')}</div>
                <Select value={normalizedLanguage} onValueChange={handleLanguageSelect}>
                  <SelectTrigger className="w-full h-12 rounded-xl bg-card border-border text-base">
                    <SelectValue placeholder={t('settings.language.selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className="z-[260] bg-popover border-border text-popover-foreground w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              <motion.div
                className="flex items-center justify-center gap-2"
                initial={false}
                animate={appearanceRevealReady ? stagedRevealShown : stagedRevealHidden}
                transition={{ duration: 0.26, ease: "easeOut", delay: 0.5 }}
              >
                {visibleSteps.map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => goToStep(item)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      currentStepIndex === index ? "w-8 bg-primary" : "w-2 bg-muted-foreground/40"
                    )}
                    aria-label={`step-${index + 1}`}
                  />
                ))}
              </motion.div>

              <motion.div
                className="w-full"
                initial={false}
                animate={appearanceRevealReady ? stagedRevealShown : stagedRevealHidden}
                transition={{ duration: 0.28, ease: "easeOut", delay: 0.58 }}
              >
                <Button className="w-full h-12 rounded-xl text-base" onClick={() => goToStep('role')}>
                  {t('onboarding.next')}
                </Button>
              </motion.div>
                </motion.div>
              )}
              {step === 'role' && (
                <motion.div
                  key="role"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  className="relative space-y-8 pt-8"
                >
              <motion.div
                className="absolute left-0 top-0"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.24, ease: "easeOut", delay: 0.02 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => goToStep('appearance')}
                >
                  <RiArrowLeftSLine className="h-5 w-5" />
                </Button>
              </motion.div>
              <motion.div
                className="text-center space-y-2"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.32, ease: "easeOut", delay: 0.08 }}
              >
                <TextEffect
                  as="h1"
                  className="text-4xl font-bold"
                  per="char"
                  preset="fade-in-blur"
                  speedReveal={1.15}
                >
                  {t('onboarding.stepRoleTitle')}
                </TextEffect>
                <TextEffect
                  className="text-muted-foreground text-base"
                  per="word"
                  preset="fade-in-blur"
                  delay={0.14}
                  speedReveal={1.1}
                >
                  {t('onboarding.stepRoleDesc')}
                </TextEffect>
              </motion.div>
              <motion.div
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.34, ease: "easeOut", delay: 0.2 }}
              >
                {roleOptions.map((role) => {
                  const isSelected = selectedRole === role.id;
                  const RoleIcon = role.icon;
                  return (
                    <button
                      type="button"
                      key={role.id}
                      className={cn(
                        "relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 p-4 transition-all",
                        isSelected ? "border-primary bg-card" : "border-muted bg-card"
                      )}
                      onClick={() => setSelectedRole(role.id)}
                    >
                      <div className="mb-2 w-11 h-11 rounded-full bg-muted flex items-center justify-center">
                        <RoleIcon className="w-5 h-5 text-foreground/80" />
                      </div>
                      <span className="font-medium text-center text-sm">{t(`roles.${role.id}`)}</span>
                    </button>
                  );
                })}
              </motion.div>
              <motion.div
                className="flex items-center justify-center gap-2"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.26, ease: "easeOut", delay: 0.34 }}
              >
                {visibleSteps.map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => goToStep(item)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      currentStepIndex === index ? "w-8 bg-primary" : "w-2 bg-muted-foreground/40"
                    )}
                    aria-label={`step-${index + 1}`}
                  />
                ))}
              </motion.div>
              <motion.div
                className="w-full"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.28, ease: "easeOut", delay: 0.42 }}
              >
                <Button className="w-full h-12 rounded-xl text-base" onClick={() => goToStep('layout')} disabled={!selectedRole}>
                  {t('onboarding.next')}
                </Button>
              </motion.div>
                </motion.div>
              )}
              {step === 'layout' && (
                <motion.div
                  key="layout"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  className="relative space-y-8 pt-8"
                >
              <motion.div
                className="absolute left-0 top-0"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.24, ease: "easeOut", delay: 0.02 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => goToStep('role')}
                >
                  <RiArrowLeftSLine className="h-5 w-5" />
                </Button>
              </motion.div>
              <motion.div
                className="text-center space-y-2"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.32, ease: "easeOut", delay: 0.08 }}
              >
                <TextEffect
                  as="h1"
                  className="text-4xl font-bold"
                  per="char"
                  preset="fade-in-blur"
                  speedReveal={1.15}
                >
                  {t('onboarding.stepLayoutTitle')}
                </TextEffect>
                <TextEffect
                  className="text-muted-foreground text-base"
                  per="word"
                  preset="fade-in-blur"
                  delay={0.14}
                  speedReveal={1.1}
                >
                  {t('onboarding.stepLayoutDesc')}
                </TextEffect>
              </motion.div>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.34, ease: "easeOut", delay: 0.2 }}
              >
                {DISPLAY_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "no-pill-radius cursor-pointer !rounded-[28px] border-2 p-3 transition-all flex flex-col items-center gap-2",
                      selectedLayout === option.value ? "border-primary bg-card" : "border-muted bg-card"
                    )}
                    onClick={() => setSelectedLayout(option.value)}
                  >
                    <div className="w-full aspect-[16/9] bg-muted rounded-[22px] flex items-center justify-center overflow-hidden relative">
                      {renderLayoutPreview(option.value)}
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-[16px]">{t(option.labelKey)}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{t(option.descriptionKey)}</div>
                    </div>
                  </button>
                ))}
              </motion.div>
              <motion.div
                className="text-center text-sm text-muted-foreground"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.26, ease: "easeOut", delay: 0.34 }}
              >
                {t('onboarding.layoutTip')}
              </motion.div>
              <motion.div
                className="flex items-center justify-center gap-2"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.26, ease: "easeOut", delay: 0.42 }}
              >
                {visibleSteps.map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => goToStep(item)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      currentStepIndex === index ? "w-8 bg-primary" : "w-2 bg-muted-foreground/40"
                    )}
                    aria-label={`step-${index + 1}`}
                  />
                ))}
              </motion.div>
              <motion.div
                className="w-full"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.28, ease: "easeOut", delay: 0.5 }}
              >
                <Button
                  className="w-full h-12 rounded-xl text-base"
                  onClick={showPermissionsStep ? () => goToStep('permissions') : completeOnboarding}
                >
                  {showPermissionsStep ? t('onboarding.next') : t('onboarding.enterHome')}
                </Button>
              </motion.div>
                </motion.div>
              )}
              {step === 'permissions' && (
                <motion.div
                  key="permissions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  className="relative space-y-8 pt-8"
                >
              <motion.div
                className="absolute left-0 top-0"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.24, ease: "easeOut", delay: 0.02 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => goToStep('layout')}
                >
                  <RiArrowLeftSLine className="h-5 w-5" />
                </Button>
              </motion.div>
              <motion.div
                className="absolute right-0 top-0"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.24, ease: "easeOut", delay: 0.02 }}
              >
                <Button
                  variant="ghost"
                  className="h-9 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
                  onClick={completeOnboarding}
                >
                  {t('onboarding.skip')}
                </Button>
              </motion.div>
              <motion.div
                className="text-center space-y-2"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.32, ease: "easeOut", delay: 0.08 }}
              >
                <TextEffect
                  as="h1"
                  className="text-4xl font-bold"
                  per="char"
                  preset="fade-in-blur"
                  speedReveal={1.15}
                >
                  {t('onboarding.stepPermissionsTitle')}
                </TextEffect>
                <TextEffect
                  className="text-muted-foreground text-base"
                  per="word"
                  preset="fade-in-blur"
                  delay={0.14}
                  speedReveal={1.1}
                >
                  {t('onboarding.stepPermissionsDesc')}
                </TextEffect>
              </motion.div>
              <motion.div
                className="grid grid-cols-1 gap-4 md:grid-cols-3"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.34, ease: "easeOut", delay: 0.2 }}
              >
                {permissionCards.map((permissionCard) => {
                  const isGranted = grantedPermissions[permissionCard.id];
                  const isUnsupported = permissionSupport[permissionCard.id] === 'unsupported';
                  const isBusy = permissionRequesting === permissionCard.id;
                  const PermissionIcon = permissionCard.icon;

                  return (
                    <div
                      key={permissionCard.id}
                      className={cn(
                        "rounded-[28px] border p-5 text-left transition-all",
                        isGranted
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-card/80 hover:border-primary/20 hover:bg-card",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={cn(
                          "flex size-12 items-center justify-center rounded-2xl",
                          isGranted ? "bg-primary/12 text-primary" : "bg-muted text-foreground/70",
                        )}>
                          {isGranted ? <RiCheckFill className="size-5" /> : <PermissionIcon className="size-5" />}
                        </div>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium",
                          isGranted
                            ? "bg-primary/12 text-primary"
                            : isUnsupported
                              ? "bg-secondary text-muted-foreground"
                              : "bg-secondary/80 text-foreground/70",
                        )}>
                          {isGranted
                            ? t('onboarding.authorized')
                            : isUnsupported
                              ? t('onboarding.unsupported')
                              : t('onboarding.authorize')}
                        </span>
                      </div>
                      <div className="mt-5 space-y-2">
                        <h3 className="text-lg font-semibold text-foreground">{permissionCard.title}</h3>
                        <p className="text-sm leading-6 text-muted-foreground">{permissionCard.description}</p>
                      </div>
                      <Button
                        className="mt-6 h-11 w-full rounded-2xl text-sm"
                        variant={isGranted ? "secondary" : "default"}
                        disabled={isGranted || isBusy || isUnsupported}
                        onClick={() => void handleRequestPermission(permissionCard.id)}
                      >
                        {isGranted
                          ? t('onboarding.authorized')
                          : isBusy
                            ? t('onboarding.authorizing')
                            : isUnsupported
                              ? t('onboarding.unsupported')
                              : t('onboarding.authorize')}
                      </Button>
                    </div>
                  );
                })}
              </motion.div>
              <motion.div
                className="text-center text-sm text-muted-foreground"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.26, ease: "easeOut", delay: 0.34 }}
              >
                {t('onboarding.permissionTip')}
              </motion.div>
              <motion.div
                className="flex items-center justify-center gap-2"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.26, ease: "easeOut", delay: 0.42 }}
              >
                {visibleSteps.map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => goToStep(item)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      currentStepIndex === index ? "w-8 bg-primary" : "w-2 bg-muted-foreground/40"
                    )}
                    aria-label={`step-${index + 1}`}
                  />
                ))}
              </motion.div>
              <motion.div
                className="w-full"
                initial={stagedRevealHidden}
                animate={stagedRevealShown}
                transition={{ duration: 0.28, ease: "easeOut", delay: 0.5 }}
              >
                <Button
                  className="w-full h-12 rounded-xl text-base"
                  onClick={completeOnboarding}
                  disabled={!allPermissionsGranted}
                >
                  {t('onboarding.enterHome')}
                </Button>
              </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
