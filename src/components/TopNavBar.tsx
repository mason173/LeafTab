import React, { memo } from 'react';
import { RiCloudFill, RiErrorWarningFill, RiRefreshFill, RiSettings4Fill } from '@/icons/ri-compat';
import { WeatherCard } from '@/components/WeatherCard';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import { useTranslation } from 'react-i18next';

function ActionButton({
  onClick,
  icon,
  label,
  variant = 'inverted',
  disableBackdropBlur = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  variant?: 'inverted' | 'default';
  disableBackdropBlur?: boolean;
}) {
  const firefox = isFirefoxBuildTarget();
  const invertedClass = disableBackdropBlur
    ? 'bg-white/10 hover:bg-white/20 text-white/90'
    : firefox
      ? 'bg-white/12 hover:bg-white/18 text-white/90'
      : 'bg-white/10 hover:bg-white/20 text-white/90 backdrop-blur-md';
  return (
    <button
      type="button"
      className={`content-stretch flex items-center justify-center gap-2 px-[10px] py-[6px] relative rounded-[999px] shrink-0 cursor-pointer transition-colors ${
        variant === 'inverted' 
          ? invertedClass
          : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
      }`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <div aria-hidden="true" className={`absolute border border-solid inset-0 pointer-events-none rounded-[999px] ${
        variant === 'inverted' ? 'border-white/10' : 'border-border'
      }`} />
      {icon}
      {label ? <span className="text-sm font-medium leading-none">{label}</span> : null}
    </button>
  );
}

interface TopNavBarProps {
  onSettingsClick?: () => void;
  onSyncClick?: () => void;
  syncStatus?: 'idle' | 'syncing' | 'conflict' | 'error';
  hideWeather?: boolean;
  settingsRevealOnHover?: boolean;
  keepControlsVisible?: boolean;
  fadeOnIdle?: boolean;
  onWeatherUpdate?: (code: number) => void;
  variant?: 'inverted' | 'default';
  className?: string;
  leftSlot?: React.ReactNode;
  reduceVisualEffects?: boolean;
}

export const TopNavBar = memo(function TopNavBar({ 
  onSettingsClick,
  onSyncClick,
  syncStatus = 'idle',
  hideWeather = false,
  settingsRevealOnHover = false,
  keepControlsVisible = false,
  fadeOnIdle = false,
  onWeatherUpdate,
  className = "",
  variant = 'inverted',
  leftSlot,
  reduceVisualEffects = false,
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
        disableBackdropBlur={reduceVisualEffects}
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
        disableBackdropBlur={reduceVisualEffects}
      />
    )
    : null;
  const settingsNode = settingsButton
    ? settingsButton
    : null;
  const revealClass = settingsRevealOnHover && !keepControlsVisible
    ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto'
    : 'opacity-100 pointer-events-auto';
  const fadeClass = fadeOnIdle ? 'opacity-50 hover:opacity-100 transition-opacity' : '';

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
        <div className={`absolute left-0 top-0 ${fadeClass}`}>
          <div className="pointer-events-auto">
            {leftSlot}
          </div>
        </div>
      ) : null}

      {syncButton ? (
        <div className={`absolute right-0 top-0 ${fadeClass}`}>
          <div className={`transition-opacity duration-300 ${firefox ? '' : 'transform-gpu'} ${revealClass}`}>
            {syncButton}
          </div>
        </div>
      ) : null}

      {settingsNode ? (
        <div className={`absolute bottom-0 right-0 ${fadeClass}`}>
          <div className={`transition-opacity duration-300 ${firefox ? '' : 'transform-gpu'} ${revealClass}`}>
            {settingsNode}
          </div>
        </div>
      ) : null}
    </div>
  );
});
