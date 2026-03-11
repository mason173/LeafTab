import React from 'react';
import { RiSettings4Fill } from '@remixicon/react';
import { WeatherCard } from './WeatherCard';

function SettingsButton({ onClick, variant = 'inverted' }: { onClick: () => void; variant?: 'inverted' | 'default' }) {
  return (
    <div 
      className={`content-stretch flex items-center justify-center p-[6px] relative rounded-[999px] shrink-0 cursor-pointer transition-colors transform-gpu ${
        variant === 'inverted' 
          ? 'bg-white/10 hover:bg-white/20 text-white/90 backdrop-blur-md' 
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
}

export function TopNavBar({ 
  onSettingsClick,
  hideWeather = false,
  settingsRevealOnHover = false,
  fadeOnIdle = false,
  onWeatherUpdate,
  className = "",
  variant = 'inverted'
}: TopNavBarProps) {
  return (
    <div className={`flex items-center justify-between w-full ${className}`} data-name="TopNavBar">
      {!hideWeather && (
        <div className={fadeOnIdle ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}>
          <WeatherCard onWeatherUpdate={onWeatherUpdate} variant={variant} />
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
          <SettingsButton onClick={onSettingsClick || (() => {})} variant={variant} />
        </div>
      </div>
    </div>
  );
}
