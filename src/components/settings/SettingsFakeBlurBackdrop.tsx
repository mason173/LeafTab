import { useState } from 'react';
import { SearchFakeBlurSurface } from '@/components/search/SearchFakeBlurSurface';
import { cn } from '@/components/ui/utils';

type SettingsFakeBlurBackdropProps = {
  radiusClassName: string;
  fakeBlurDisabled?: boolean;
  tone?: 'default' | 'drawer';
  darkCoverStrength?: 'normal' | 'deep';
  sliceOverscanPx?: number;
  sliceScale?: number;
};

export function SettingsFakeBlurBackdrop({
  radiusClassName,
  fakeBlurDisabled = false,
  tone = 'drawer',
  darkCoverStrength = 'deep',
  sliceOverscanPx = 180,
  sliceScale = 1.08,
}: SettingsFakeBlurBackdropProps) {
  const [surfaceNode, setSurfaceNode] = useState<HTMLDivElement | null>(null);

  if (fakeBlurDisabled) {
    return null;
  }

  return (
    <div
      data-settings-surface-backdrop="true"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div
        ref={setSurfaceNode}
        className={cn('absolute inset-0', radiusClassName)}
      />
      <SearchFakeBlurSurface
        surfaceNode={surfaceNode}
        tone={tone}
        radiusClassName={radiusClassName}
        darkCoverStrength={darkCoverStrength}
        sliceOverscanPx={sliceOverscanPx}
        sliceScale={sliceScale}
        specularHighlight="none"
        atmosphereMode="flat"
      />
    </div>
  );
}
