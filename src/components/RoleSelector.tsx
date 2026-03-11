
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { useTranslation } from 'react-i18next';
import {
  RiArrowLeftSLine,
  RiBankFill,
  RiBriefcase4Fill,
  RiCheckboxBlankFill,
  RiCheckFill,
  RiCodeSSlashFill,
  RiComputerFill,
  RiDashboardFill,
  RiFlashlightFill,
  RiFolderChartFill,
  RiGraduationCapFill,
  RiMegaphoneFill,
  RiMoonFill,
  RiPaletteFill,
  RiSunFill,
  RiTeamFill,
} from '@remixicon/react';
import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { applyDynamicAccentColor, clearDynamicAccentColor, resolveDynamicAccentColor } from "@/utils/dynamicAccentColor";
import { DISPLAY_MODE_OPTIONS, type DisplayMode } from "@/displayMode/config";

interface RoleSelectorProps {
  open: boolean;
  onSelect: (roleFile: string, roleId: string, displayMode?: DisplayMode) => void;
}

const STEP_ORDER = ['appearance', 'role', 'layout'] as const;
type StepType = (typeof STEP_ORDER)[number];

export function RoleSelector({ open, onSelect }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<DisplayMode>('panoramic');
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [accentColor, setAccentColor] = useState<string>('dynamic');
  const [step, setStep] = useState<StepType>('appearance');
  const [direction, setDirection] = useState(1);
  const { i18n, t } = useTranslation();
  const { setTheme } = useTheme();
  const roleOptions = [
    {
      id: 'programmer',
      title: t('roles.programmer'),
      icon: RiCodeSSlashFill,
      file: 'leaftab_backup_Programmer.leaftab'
    },
    {
      id: 'product_manager',
      title: t('roles.product_manager'),
      icon: RiBriefcase4Fill,
      file: 'leaftab_backup_product_manager.leaftab'
    },
    {
      id: 'designer',
      title: t('roles.designer'),
      icon: RiPaletteFill,
      file: 'leaftab_backup_designer.leaftab'
    },
    {
      id: 'student',
      title: t('roles.student'),
      icon: RiGraduationCapFill,
      file: 'leaftab_backup_student.leaftab'
    },
    {
      id: 'marketer',
      title: t('roles.marketer'),
      icon: RiMegaphoneFill,
      file: 'leaftab_backup_marketer.leaftab'
    },
    {
      id: 'finance',
      title: t('roles.finance'),
      icon: RiBankFill,
      file: 'leaftab_backup_finance.leaftab'
    },
    {
      id: 'hr',
      title: t('roles.hr'),
      icon: RiTeamFill,
      file: 'leaftab_backup_hr.leaftab'
    },
    {
      id: 'admin',
      title: t('roles.admin'),
      icon: RiFolderChartFill,
      file: 'leaftab_backup_admin.leaftab'
    }
  ];

  const handleLanguageSelect = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  const handleLayoutConfirm = () => {
    if (selectedRole) {
    const role = roleOptions.find(r => r.id === selectedRole);
      if (role) {
        let roleFile = role.file;
        // If language is not Simplified Chinese, load the English version of the profile
        if (i18n.language !== 'zh' && i18n.language !== 'zh-CN') {
          roleFile = roleFile.replace('.leaftab', '_en.leaftab');
        }
        onSelect(roleFile, role.id, selectedLayout);
      }
    }
  };

  const handleThemeSelect = (theme: 'light' | 'dark' | 'system') => {
    setSelectedTheme(theme);
    setTheme(theme);
  };

  const colorOptions = [
    { name: 'dynamic', value: 'linear-gradient(135deg, #22c55e 0%, #3b82f6 45%, #a855f7 100%)', label: t('settings.accent.dynamic') },
    { name: 'mono', value: 'linear-gradient(90deg, #111111 0 50%, #ffffff 50% 100%)', label: t('settings.accent.mono') },
    { name: 'green', value: '#22c55e', label: t('settings.accent.green') },
    { name: 'blue', value: '#3b82f6', label: t('settings.accent.blue') },
    { name: 'purple', value: '#a855f7', label: t('settings.accent.purple') },
    { name: 'orange', value: '#f97316', label: t('settings.accent.orange') },
    { name: 'pink', value: '#ec4899', label: t('settings.accent.pink') },
    { name: 'red', value: '#ef4444', label: t('settings.accent.red') },
  ];

  const applyAccentFromStorage = async (colorName: string) => {
    if (colorName !== 'dynamic') {
      clearDynamicAccentColor();
      document.documentElement.setAttribute('data-accent-color', colorName);
      return;
    }
    document.documentElement.setAttribute('data-accent-color', 'dynamic');
    applyDynamicAccentColor('#3b82f6');
  };

  useEffect(() => {
    const stored = localStorage.getItem('accentColor');
    const savedColor = stored || 'dynamic';
    setAccentColor(savedColor);
    if (!stored) {
      localStorage.setItem('accentColor', savedColor);
      window.dispatchEvent(new Event('leaftab-accent-color-changed'));
    }
    applyAccentFromStorage(savedColor);
  }, []);

  const handleColorChange = (colorName: string) => {
    setAccentColor(colorName);
    localStorage.setItem('accentColor', colorName);
    applyAccentFromStorage(colorName);
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
  const currentStepIndex = STEP_ORDER.indexOf(step);

  const goToStep = (nextStep: StepType) => {
    const nextIndex = STEP_ORDER.indexOf(nextStep);
    setDirection(nextIndex > currentStepIndex ? 1 : -1);
    setStep(nextStep);
  };
  const renderLayoutPreview = (mode: DisplayMode) => {
    if (mode === 'panoramic') {
      return (
        <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center p-4 gap-2">
          <RiDashboardFill className="w-9 h-9 text-foreground/50" />
          <div className="w-full h-full border-2 border-foreground/10 rounded absolute inset-0 m-2"></div>
        </div>
      );
    }
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
    <div className="fixed inset-0 z-[200] bg-background text-foreground overflow-y-auto">
      <div className="min-h-screen w-full flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[800px]">
          <div className="overflow-hidden">
            <AnimatePresence initial={false} mode="wait" custom={direction}>
              {step === 'appearance' && (
                <motion.div
                  key="appearance"
                  custom={direction}
                  initial={{ opacity: 0, x: direction > 0 ? 120 : -120 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -120 : 120 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  className="space-y-10"
                >
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold">{t('onboarding.stepAppearanceTitle')}</h1>
                <p className="text-muted-foreground text-base">{t('onboarding.stepAppearanceDesc')}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <button
                  type="button"
                  className={cn(
                    "no-pill-radius cursor-pointer !rounded-xl border-2 p-3 transition-all flex flex-col items-center gap-2 text-left",
                    selectedTheme === 'system' ? "border-primary bg-card" : "border-muted bg-card"
                  )}
                  onClick={() => handleThemeSelect('system')}
                >
                  <div className="w-full aspect-[16/8] bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    <RiComputerFill className="w-7 h-7 text-foreground/70" />
                  </div>
                  <div className="w-full flex items-center justify-between">
                    <div className="font-semibold text-base">{t('settings.theme.system')}</div>
                    {selectedTheme === 'system' && <RiCheckFill className="h-4 w-4 text-primary" />}
                  </div>
                </button>

                <button
                  type="button"
                  className={cn(
                    "no-pill-radius cursor-pointer !rounded-xl border-2 p-3 transition-all flex flex-col items-center gap-2 text-left",
                    selectedTheme === 'dark' ? "border-primary bg-card" : "border-muted bg-card"
                  )}
                  onClick={() => handleThemeSelect('dark')}
                >
                  <div className="w-full aspect-[16/8] bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    <RiMoonFill className="w-7 h-7 text-foreground/70" />
                  </div>
                  <div className="w-full flex items-center justify-between">
                    <div className="font-semibold text-base">{t('settings.theme.dark')}</div>
                    {selectedTheme === 'dark' && <RiCheckFill className="h-4 w-4 text-primary" />}
                  </div>
                </button>

                <button
                  type="button"
                  className={cn(
                    "no-pill-radius cursor-pointer !rounded-xl border-2 p-3 transition-all flex flex-col items-center gap-2 text-left",
                    selectedTheme === 'light' ? "border-primary bg-card" : "border-muted bg-card"
                  )}
                  onClick={() => handleThemeSelect('light')}
                >
                  <div className="w-full aspect-[16/8] bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    <RiSunFill className="w-7 h-7 text-foreground/70" />
                  </div>
                  <div className="w-full flex items-center justify-between">
                    <div className="font-semibold text-base">{t('settings.theme.light')}</div>
                    {selectedTheme === 'light' && <RiCheckFill className="h-4 w-4 text-primary" />}
                  </div>
                </button>
              </div>

              <div className="w-full">
                <div className="flex items-center justify-center w-full px-[6px] gap-3 flex-wrap">
                  {colorOptions.map((option) => (
                    <button
                      key={option.name}
                      onClick={() => handleColorChange(option.name)}
                      className={`size-8 rounded-full overflow-hidden transition-all ${accentColor === option.name ? 'ring-2 ring-offset-2 ring-primary scale-105' : 'hover:scale-105'}`}
                      style={option.name === 'dynamic'
                        ? { backgroundImage: option.value }
                        : option.name === 'mono'
                        ? { backgroundImage: option.value, boxShadow: 'inset 0 0 0 1px rgba(148, 163, 184, 0.45)' }
                        : { backgroundColor: option.value }}
                      aria-label={`Select ${option.label} color`}
                    />
                  ))}
                </div>
              </div>

              <div className="w-full space-y-2">
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
              </div>

              <div className="flex items-center justify-center gap-2">
                {STEP_ORDER.map((item, index) => (
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
              </div>

              <div className="w-full">
                <Button className="w-full h-12 rounded-xl text-base" onClick={() => goToStep('role')}>
                  {t('onboarding.next')}
                </Button>
              </div>
                </motion.div>
              )}
              {step === 'role' && (
                <motion.div
                  key="role"
                  custom={direction}
                  initial={{ opacity: 0, x: direction > 0 ? 120 : -120 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -120 : 120 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  className="relative space-y-8 pt-8"
                >
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 top-0 h-10 w-10 rounded-full"
                onClick={() => goToStep('appearance')}
              >
                <RiArrowLeftSLine className="h-5 w-5" />
              </Button>
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold">{t('onboarding.stepRoleTitle')}</h1>
                <p className="text-muted-foreground text-base">{t('onboarding.stepRoleDesc')}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                      {isSelected && <RiCheckFill className="absolute right-3 top-3 h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-2">
                {STEP_ORDER.map((item, index) => (
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
              </div>
              <div className="w-full">
                <Button className="w-full h-12 rounded-xl text-base" onClick={() => goToStep('layout')} disabled={!selectedRole}>
                  {t('onboarding.next')}
                </Button>
              </div>
                </motion.div>
              )}
              {step === 'layout' && (
                <motion.div
                  key="layout"
                  custom={direction}
                  initial={{ opacity: 0, x: direction > 0 ? 120 : -120 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -120 : 120 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  className="relative space-y-8 pt-8"
                >
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 top-0 h-10 w-10 rounded-full"
                onClick={() => goToStep('role')}
              >
                <RiArrowLeftSLine className="h-5 w-5" />
              </Button>
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold">{t('onboarding.stepLayoutTitle')}</h1>
                <p className="text-muted-foreground text-base">{t('onboarding.stepLayoutDesc')}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                {DISPLAY_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "no-pill-radius cursor-pointer !rounded-xl border-2 p-3 transition-all flex flex-col items-center gap-2",
                      selectedLayout === option.value ? "border-primary bg-card" : "border-muted bg-card"
                    )}
                    onClick={() => setSelectedLayout(option.value)}
                  >
                    <div className="w-full aspect-[16/9] bg-muted rounded-lg flex items-center justify-center overflow-hidden relative">
                      {renderLayoutPreview(option.value)}
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-[16px]">{t(option.labelKey)}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{t(option.descriptionKey)}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="text-center text-sm text-muted-foreground">
                {t('onboarding.layoutTip')}
              </div>
              <div className="flex items-center justify-center gap-2">
                {STEP_ORDER.map((item, index) => (
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
              </div>
              <div className="w-full">
                <Button className="w-full h-12 rounded-xl text-base" onClick={handleLayoutConfirm}>
                  {t('onboarding.enterHome')}
                </Button>
              </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
