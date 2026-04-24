import { type HTMLAttributes, type ReactNode } from 'react';
import { MaterialSurfaceFrame } from '@/components/frosted/MaterialSurfaceFrame';
import { getFrostedSurfacePreset, type FrostedSurfacePreset } from '@/components/frosted/frostedSurfacePresets';
import { useStableElementState } from '@/hooks/useStableElementState';
import { cn } from '@/components/ui/utils';

type FrostedSurfaceProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  preset?: FrostedSurfacePreset;
  children?: ReactNode;
  contentClassName?: string;
  surfaceClassName?: string;
  dataTestId?: string;
  radiusClassName?: string;
  surfaceTone?: 'default' | 'drawer';
  lightModeOverlayOpacity?: number;
  darkModeOverlayOpacity?: number;
  showBorder?: boolean;
  surfaceRef?: (node: HTMLDivElement | null) => void;
};

export function FrostedSurface({
  preset = 'search-pill',
  className,
  contentClassName,
  surfaceClassName,
  dataTestId,
  radiusClassName,
  style,
  surfaceTone = 'default',
  lightModeOverlayOpacity,
  darkModeOverlayOpacity,
  showBorder,
  surfaceRef,
  children,
  ...props
}: FrostedSurfaceProps) {
  const presetConfig = getFrostedSurfacePreset(preset);
  const [surfaceNode, handleSurfaceRef] = useStableElementState<HTMLDivElement>({ ref: surfaceRef });
  const resolvedRadiusClassName = radiusClassName ?? presetConfig.radiusClassName;

  return (
    <div
      ref={handleSurfaceRef}
      className={cn(
        presetConfig.shellClassName,
        surfaceClassName,
        className,
      )}
      data-testid={dataTestId}
      style={style}
      {...props}
    >
      <MaterialSurfaceFrame
        surfaceNode={surfaceNode}
        preset={preset}
        tone={surfaceTone}
        radiusClassName={resolvedRadiusClassName}
        lightModeOverlayOpacity={lightModeOverlayOpacity}
        darkModeOverlayOpacity={darkModeOverlayOpacity}
        showBorder={showBorder}
        contentClassName={contentClassName}
      >
        {children}
      </MaterialSurfaceFrame>
    </div>
  );
}
