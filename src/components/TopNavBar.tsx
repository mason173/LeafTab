import React, { memo } from 'react';
import { RiCloudFill, RiErrorWarningFill, RiRefreshFill, RiSettings4Fill } from '@/icons/ri-compat';
import { WeatherCard } from '@/components/WeatherCard';
import { Button } from '@/components/ui/button';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import { useTranslation } from 'react-i18next';

function ActionButton({
  onClick,
  icon,
  label,
  variant = 'inverted',
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  variant?: 'inverted' | 'default';
}) {
  const invertedClass = 'text-white/85 hover:text-white';
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center p-1 shrink-0 cursor-pointer transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        variant === 'inverted' 
          ? invertedClass
          : 'text-muted-foreground hover:text-foreground'
      }`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

interface TopNavBarProps {
  onSettingsClick?: () => void;
  onSyncClick?: () => void;
  syncStatus?: 'idle' | 'syncing' | 'conflict' | 'error';
  hideWeather?: boolean;
  settingsRevealOnHover?: boolean;
  leftSlotRevealOnHover?: boolean;
  keepControlsVisible?: boolean;
  fadeOnIdle?: boolean;
  onWeatherUpdate?: (code: number) => void;
  variant?: 'inverted' | 'default';
  className?: string;
  leftSlot?: React.ReactNode;
  reduceVisualEffects?: boolean;
  introGuide?: {
    step: TopNavIntroStep;
    onAcknowledge: () => void;
  } | null;
}

export type TopNavIntroStep = 'scenario' | 'sync' | 'settings';

function TopNavIntroBubble({
  title,
  description,
  align = 'start',
  actionLabel,
  onAcknowledge,
}: {
  title: string;
  description: string;
  align?: 'start' | 'end';
  actionLabel: string;
  onAcknowledge: () => void;
}) {
  const arrowPositionClass = align === 'end'
    ? 'right-4'
    : 'left-4';

  return (
    <div
      className={`absolute top-[calc(100%+12px)] z-20 w-[248px] rounded-2xl border border-border bg-popover p-3 text-left text-popover-foreground shadow-[0_12px_40px_rgba(0,0,0,0.18)] ${align === 'end' ? 'right-0' : 'left-0'} pointer-events-auto`}
      role="dialog"
      aria-live="polite"
    >
      <div
        aria-hidden="true"
        className={`absolute -top-1.5 size-3 rotate-45 border-l border-t border-border bg-popover ${arrowPositionClass}`}
      />
      <div className="space-y-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold leading-none">{title}</p>
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-full"
            onClick={onAcknowledge}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export const TopNavBar = memo(function TopNavBar({ 
  onSettingsClick,
  onSyncClick,
  syncStatus = 'idle',
  hideWeather = false,
  settingsRevealOnHover = false,
  leftSlotRevealOnHover = false,
  keepControlsVisible = false,
  fadeOnIdle = false,
  onWeatherUpdate,
  className = "",
  variant = 'inverted',
  leftSlot,
  reduceVisualEffects = false,
  introGuide = null,
}: TopNavBarProps) {
  const { t } = useTranslation();
  const firefox = isFirefoxBuildTarget();
  const weatherContent = (
    <WeatherCard
      onWeatherUpdate={onWeatherUpdate}
      variant={variant}
      disableBackdropBlur={reduceVisualEffects}
    />
  );
  const weatherNode = weatherContent;
  const syncIcon = syncStatus === 'syncing'
    ? <RiRefreshFill className="size-4.5 animate-spin" />
    : syncStatus === 'conflict' || syncStatus === 'error'
      ? <RiErrorWarningFill className="size-4.5" />
      : <RiCloudFill className="size-4.5" />;
  const syncLabel = syncStatus === 'syncing'
    ? t('leaftabSyncCenter.nav.syncing', { defaultValue: '同步中' })
    : syncStatus === 'conflict' || syncStatus === 'error'
      ? t('leaftabSyncCenter.nav.attention', { defaultValue: '同步异常' })
      : t('leaftabSyncCenter.title', { defaultValue: '同步中心' });
  const syncButton = onSyncClick
    ? (
      <ActionButton
        onClick={onSyncClick}
        icon={syncIcon}
        label={syncLabel}
        variant={variant}
      />
    )
    : null;
  const settingsButton = onSettingsClick
    ? (
      <ActionButton
        onClick={onSettingsClick}
        icon={<RiSettings4Fill className="size-4.5" />}
        label={t('common.settings', { defaultValue: '设置' })}
        variant={variant}
      />
    )
    : null;
  const settingsNode = settingsButton
    ? settingsButton
    : null;
  const revealClass = settingsRevealOnHover && !keepControlsVisible
    ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto'
    : 'opacity-100 pointer-events-auto';
  const leftRevealClass = leftSlotRevealOnHover && !keepControlsVisible
    ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto'
    : 'opacity-100 pointer-events-auto';
  const fadeClass = fadeOnIdle ? 'opacity-50 hover:opacity-100 transition-opacity' : '';
  const actionFadeClass = fadeOnIdle ? 'opacity-50 hover:opacity-100 transition-opacity' : '';
  const introGuideContent = introGuide
    ? {
        scenario: {
          title: t('topNavIntro.scenario.title', { defaultValue: '情景模式' }),
          description: t('topNavIntro.scenario.description', { defaultValue: '这里可以快速切换当前情景模式，也能新建、编辑不同的工作或生活场景。' }),
        },
        sync: {
          title: t('topNavIntro.sync.title', { defaultValue: '同步中心' }),
          description: t('topNavIntro.sync.description', { defaultValue: '这里可以查看同步状态，并进入同步中心处理手动同步、书签同步和异常提醒。' }),
        },
        settings: {
          title: t('topNavIntro.settings.title', { defaultValue: '设置' }),
          description: t('topNavIntro.settings.description', { defaultValue: '这里可以打开设置面板，调整布局、壁纸、搜索和更多个性化选项。' }),
        },
      }[introGuide.step]
    : null;

  return (
    <div className={`relative w-full h-full ${className}`} data-name="TopNavBar">
      {!hideWeather && (
        <div className={`absolute left-0 top-0 ${fadeClass}`}>
          <div className="pointer-events-auto">
            {weatherNode}
          </div>
        </div>
      )}

      {leftSlot ? (
        <div className="absolute left-0 top-0">
          <div className={`${fadeClass}`}>
            <div className={`transition-opacity duration-300 ${firefox ? '' : 'transform-gpu'} ${leftRevealClass}`}>
              {leftSlot}
            </div>
          </div>
          {introGuide?.step === 'scenario' && introGuideContent ? (
            <TopNavIntroBubble
              title={introGuideContent.title}
              description={introGuideContent.description}
              actionLabel={t('topNavIntro.confirm', { defaultValue: '我知道了' })}
              onAcknowledge={introGuide.onAcknowledge}
            />
          ) : null}
        </div>
      ) : null}

      {syncButton || settingsNode ? (
        <div className="absolute right-0 top-0">
          <div
            className={`flex items-center gap-6 transition-opacity duration-300 ${firefox ? '' : 'transform-gpu'} ${revealClass}`}
          >
            {syncButton ? (
              <div className="relative">
                <div className={actionFadeClass}>
                  {syncButton}
                </div>
                {introGuide?.step === 'sync' && introGuideContent ? (
                  <TopNavIntroBubble
                    title={introGuideContent.title}
                    description={introGuideContent.description}
                    align="end"
                    actionLabel={t('topNavIntro.confirm', { defaultValue: '我知道了' })}
                    onAcknowledge={introGuide.onAcknowledge}
                  />
                ) : null}
              </div>
            ) : null}
            {settingsNode ? (
              <div className="relative">
                <div className={actionFadeClass}>
                  {settingsNode}
                </div>
                {introGuide?.step === 'settings' && introGuideContent ? (
                  <TopNavIntroBubble
                    title={introGuideContent.title}
                    description={introGuideContent.description}
                    align="end"
                    actionLabel={t('topNavIntro.confirm', { defaultValue: '我知道了' })}
                    onAcknowledge={introGuide.onAcknowledge}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
});
