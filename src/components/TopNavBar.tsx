import React, { memo, useMemo } from 'react';
import { RiSettings4Fill } from '@/icons/ri-compat';
import { WeatherCard } from '@/components/WeatherCard';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';

function SettingsButton({
  onClick,
  variant = 'inverted',
  disableBackdropBlur = false,
}: {
  onClick: () => void;
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
    <div 
      className={`content-stretch flex items-center justify-center p-[6px] relative rounded-[999px] shrink-0 cursor-pointer transition-colors ${
        variant === 'inverted' 
          ? invertedClass
          : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
      }`} 
      data-name="Settings"
      onClick={onClick}
    >
      <div aria-hidden="true" className={`absolute border border-solid inset-0 pointer-events-none rounded-[999px] ${
        variant === 'inverted' ? 'border-white/10' : 'border-border'
      }`} />
      <RiSettings4Fill className="size-5" />
    </div>
  );
}

interface TopNavBarProps {
  onSettingsClick?: () => void;
  hideWeather?: boolean;
  settingsRevealOnHover?: boolean;
  keepControlsVisible?: boolean;
  fadeOnIdle?: boolean;
  onWeatherUpdate?: (code: number) => void;
  variant?: 'inverted' | 'default';
  className?: string;
  rightSlot?: React.ReactNode;
  reduceVisualEffects?: boolean;
}

export const TopNavBar = memo(function TopNavBar({ 
  onSettingsClick,
  hideWeather = false,
  settingsRevealOnHover = false,
  keepControlsVisible = false,
  fadeOnIdle = false,
  onWeatherUpdate,
  className = "",
  variant = 'inverted',
  rightSlot,
  reduceVisualEffects = false,
}: TopNavBarProps) {
  const firefox = isFirefoxBuildTarget();
  const weatherContent = (
    <WeatherCard
      onWeatherUpdate={onWeatherUpdate}
      variant={variant}
      disableBackdropBlur={reduceVisualEffects}
    />
  );
  const weatherNode = weatherContent;
  const settingsButton = onSettingsClick
    ? (
      <SettingsButton
        onClick={onSettingsClick}
        variant={variant}
        disableBackdropBlur={reduceVisualEffects}
      />
    )
    : null;
  const settingsNode = settingsButton
    ? settingsButton
    : null;

  return (
    <div className={`flex items-center justify-between w-full ${className}`} data-name="TopNavBar">
      {!hideWeather && (
        <div className={fadeOnIdle ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}>
          {weatherNode}
        </div>
      )}
      
      <div className={fadeOnIdle ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}>
        <div
          className={`flex items-center gap-3 transition-opacity duration-300 ${firefox ? '' : 'transform-gpu'} ${
            settingsRevealOnHover && !keepControlsVisible
              ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto'
              : 'opacity-100'
          }`}
        >
          {rightSlot}
          {settingsNode}
        </div>
      </div>
    </div>
  );
});
