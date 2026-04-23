import { useCallback, useState, type CSSProperties, type MouseEventHandler, type ReactNode } from 'react';
import { SearchFakeBlurSurface } from '@/components/search/SearchFakeBlurSurface';
import { cn } from '@/components/ui/utils';

type FrostedSurfacePreset = 'search-pill' | 'floating-toolbar';

type FrostedSurfaceProps = {
  preset?: FrostedSurfacePreset;
  className?: string;
  contentClassName?: string;
  surfaceClassName?: string;
  style?: CSSProperties;
  surfaceTone?: 'default' | 'drawer';
  modeOverlayOpacity?: number;
  showBorder?: boolean;
  surfaceRef?: (node: HTMLDivElement | null) => void;
  onClick?: MouseEventHandler<HTMLDivElement>;
  children: ReactNode;
};

const FROSTED_SURFACE_PRESETS: Record<FrostedSurfacePreset, {
  shellClassName: string;
  radiusClassName: string;
  contentClassName: string;
  modeOverlayOpacity: number;
  showBorder: boolean;
}> = {
  'search-pill': {
    shellClassName: 'content-stretch group relative isolate flex w-full min-w-0 self-stretch cursor-text items-center rounded-[999px]',
    radiusClassName: 'rounded-[999px]',
    contentClassName: 'relative z-10 flex w-full min-w-0 items-center',
    modeOverlayOpacity: 0.75,
    showBorder: false,
  },
  'floating-toolbar': {
    shellClassName: 'content-stretch group relative isolate rounded-[999px] shadow-xl',
    radiusClassName: 'rounded-[999px]',
    contentClassName: 'relative z-10',
    modeOverlayOpacity: 0.75,
    showBorder: false,
  },
};

export function FrostedSurface({
  preset = 'search-pill',
  className,
  contentClassName,
  surfaceClassName,
  style,
  surfaceTone = 'default',
  modeOverlayOpacity,
  showBorder,
  surfaceRef,
  onClick,
  children,
}: FrostedSurfaceProps) {
  const presetConfig = FROSTED_SURFACE_PRESETS[preset];
  const [surfaceNode, setSurfaceNode] = useState<HTMLDivElement | null>(null);

  const handleSurfaceRef = useCallback((node: HTMLDivElement | null) => {
    setSurfaceNode(node);
    surfaceRef?.(node);
  }, [surfaceRef]);

  return (
    <div
      ref={handleSurfaceRef}
      className={cn(
        presetConfig.shellClassName,
        surfaceClassName,
        className,
      )}
      style={style}
      onClick={onClick}
    >
      <SearchFakeBlurSurface
        surfaceNode={surfaceNode}
        tone={surfaceTone}
        radiusClassName={presetConfig.radiusClassName}
        modeOverlayOpacity={modeOverlayOpacity ?? presetConfig.modeOverlayOpacity}
        showBorder={showBorder ?? presetConfig.showBorder}
      />
      <div className={cn(presetConfig.contentClassName, contentClassName)}>
        {children}
      </div>
    </div>
  );
}
