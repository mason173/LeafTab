import type { ReactNode } from 'react';
import {
  FrostedBackdrop,
  type FrostedSurfaceTone,
} from '@/components/frosted/FrostedBackdrop';
import {
  useFrostedSurfacePreset,
  type FrostedSurfacePreset,
} from '@/components/frosted/frostedSurfacePresets';
import { cn } from '@/components/ui/utils';

type MaterialSurfaceFrameProps = {
  surfaceNode: HTMLElement | null;
  preset?: FrostedSurfacePreset;
  tone?: FrostedSurfaceTone;
  radiusClassName?: string;
  lightModeOverlayOpacity?: number;
  darkModeOverlayOpacity?: number;
  showBorder?: boolean;
  contentClassName?: string;
  children?: ReactNode;
};

export function MaterialSurfaceFrame({
  surfaceNode,
  preset = 'search-pill',
  tone = 'default',
  radiusClassName,
  lightModeOverlayOpacity,
  darkModeOverlayOpacity,
  showBorder,
  contentClassName,
  children,
}: MaterialSurfaceFrameProps) {
  const presetConfig = useFrostedSurfacePreset(preset);
  const resolvedRadiusClassName = radiusClassName ?? presetConfig.radiusClassName;

  return (
    <>
      <FrostedBackdrop
        surfaceNode={surfaceNode}
        tone={tone}
        radiusClassName={resolvedRadiusClassName}
        lightModeOverlayOpacity={lightModeOverlayOpacity ?? presetConfig.material.lightSurfaceOverlayOpacity}
        darkModeOverlayOpacity={darkModeOverlayOpacity ?? presetConfig.material.darkSurfaceOverlayOpacity}
        showBorder={showBorder ?? presetConfig.material.borderVisible}
        imageOverscanPx={presetConfig.material.sampleOverscanPx ?? 0}
        imageScale={presetConfig.material.sampleScale ?? 1}
        imageBlurPx={presetConfig.material.sampleBlurPx ?? 0}
        wallpaperMaskOpacityMultiplier={presetConfig.material.backdropMaskStrength ?? 1}
      />
      <div className={cn(presetConfig.contentClassName, contentClassName)}>
        {children}
      </div>
    </>
  );
}
