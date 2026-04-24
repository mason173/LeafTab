import { FrostedBackdrop } from '@/components/frosted/FrostedBackdrop';

export function SearchFakeBlurSurface({
  surfaceNode,
  tone = 'default',
  radiusClassName = 'rounded-[999px]',
  modeOverlayOpacity = 0.65,
  modeOverlayTransitionMs = 220,
  showBorder = true,
}: {
  surfaceNode: HTMLElement | null;
  tone?: 'default' | 'drawer';
  radiusClassName?: string;
  modeOverlayOpacity?: number;
  modeOverlayTransitionMs?: number;
  showBorder?: boolean;
}) {
  return (
    <FrostedBackdrop
      surfaceNode={surfaceNode}
      tone={tone}
      radiusClassName={radiusClassName}
      modeOverlayOpacity={modeOverlayOpacity}
      modeOverlayTransitionMs={modeOverlayTransitionMs}
      showBorder={showBorder}
    />
  );
}
