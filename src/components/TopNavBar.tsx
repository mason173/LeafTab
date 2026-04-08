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
          <div className={`transition-opacity duration-300 ${firefox ? '' : 'transform-gpu'} ${leftRevealClass}`}>
            {leftSlot}
          </div>
        </div>
      ) : null}

      {syncButton || settingsNode ? (
        <div className="absolute right-0 top-0">
          <div
            className={`flex items-center gap-6 transition-opacity duration-300 ${firefox ? '' : 'transform-gpu'} ${revealClass}`}
          >
            {syncButton ? <div className={actionFadeClass}>{syncButton}</div> : null}
            {settingsNode ? <div className={actionFadeClass}>{settingsNode}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
});
