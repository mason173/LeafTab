import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiSettings4Fill } from '@remixicon/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Button } from "./ui/button";
import ScenarioModeMenu from './ScenarioModeMenu';
import { ScenarioMode } from "@/scenario/scenario";
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
  showScenarioMode: boolean;
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  scenarioModeOpen: boolean;
  onScenarioModeOpenChange: (open: boolean) => void;
  onScenarioModeSelect: (id: string) => void;
  onScenarioModeCreate: () => void;
  onScenarioModeEdit: (id: string) => void;
  onScenarioModeDelete: (id: string) => void;
  onWeatherUpdate?: (code: number) => void;
  variant?: 'inverted' | 'default';
}

export function TopNavBar({ 
  onSettingsClick,
  hideWeather = false,
  settingsRevealOnHover = false,
  showScenarioMode,
  scenarioModes,
  selectedScenarioId,
  scenarioModeOpen,
  onScenarioModeOpenChange,
  onScenarioModeSelect,
  onScenarioModeCreate,
  onScenarioModeEdit,
  onScenarioModeDelete,
  onWeatherUpdate,
  className = "",
  variant = 'inverted'
}: TopNavBarProps & { className?: string }) {
  return (
    <div className={`flex items-center justify-between w-full ${className}`} data-name="TopNavBar">
      {!hideWeather && <WeatherCard onWeatherUpdate={onWeatherUpdate} variant={variant} />}
      
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
  );
}
