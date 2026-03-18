import React, { Suspense, memo } from 'react';
import { RiSettings4Fill } from '@/icons/ri-compat';
import { Magnetic } from '@/components/motion-primitives/magnetic';
import { LazyWeatherCard } from '@/lazy/components';

function WeatherCardFallback({
  variant,
  disableBackdropBlur = false,
}: {
  variant: 'inverted' | 'default';
  disableBackdropBlur?: boolean;
}) {
  return (
    <div
      className={`content-stretch flex items-center justify-center p-[3px] relative rounded-[999px] shrink-0 ${
        variant === 'inverted'
          ? (disableBackdropBlur ? 'bg-white/10' : 'bg-white/10 backdrop-blur-md')
          : 'bg-secondary'
      }`}
      aria-hidden="true"
    >
      <div
        className={`absolute border border-solid inset-0 pointer-events-none rounded-[999px] ${
          variant === 'inverted' ? 'border-white/10' : 'border-border'
        }`}
      />
      <div className={`h-[34px] w-[150px] rounded-[999px] animate-pulse ${
        variant === 'inverted' ? 'bg-white/10' : 'bg-secondary/70'
      }`}
      />
    </div>
  );
}

function SettingsButton({
  onClick,
  variant = 'inverted',
  disableBackdropBlur = false,
}: {
  onClick: () => void;
  variant?: 'inverted' | 'default';
  disableBackdropBlur?: boolean;
}) {
  const invertedClass = disableBackdropBlur
    ? 'bg-white/10 hover:bg-white/20 text-white/90'
    : 'bg-white/10 hover:bg-white/20 text-white/90 backdrop-blur-md';
  return (
    <div 
      className={`content-stretch flex items-center justify-center p-[6px] relative rounded-[999px] shrink-0 cursor-pointer transition-colors transform-gpu ${
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
  fadeOnIdle = false,
  onWeatherUpdate,
  className = "",
  variant = 'inverted',
  rightSlot,
  reduceVisualEffects = false,
}: TopNavBarProps) {
  const weatherContent = (
    <Suspense fallback={<WeatherCardFallback variant={variant} disableBackdropBlur={reduceVisualEffects} />}>
      <LazyWeatherCard
        onWeatherUpdate={onWeatherUpdate}
        variant={variant}
        disableBackdropBlur={reduceVisualEffects}
      />
    </Suspense>
  );
  const weatherNode = reduceVisualEffects
    ? weatherContent
    : <Magnetic intensity={0.32} range={110}>{weatherContent}</Magnetic>;
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
    ? (reduceVisualEffects ? settingsButton : <Magnetic intensity={0.32} range={110}>{settingsButton}</Magnetic>)
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
          className={`flex items-center gap-3 transition-opacity duration-300 transform-gpu ${
            settingsRevealOnHover
              ? 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
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
