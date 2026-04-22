import {
  BottomCropFadeOverlay,
  resolveBottomCropFadeHeight,
  resolveBottomCropFadeInset,
} from '@/components/home/BottomCropFadeOverlay';

export const resolveDrawerShortcutOverflowFadeHeight = resolveBottomCropFadeHeight;
export const resolveDrawerShortcutOverflowFadeInset = resolveBottomCropFadeInset;

type DrawerShortcutOverflowFadeOverlayProps = {
  heightPx: number;
  className?: string;
};

export function DrawerShortcutOverflowFadeOverlay({
  heightPx,
  className,
}: DrawerShortcutOverflowFadeOverlayProps) {
  return (
    <BottomCropFadeOverlay
      className={className}
      heightPx={heightPx}
    />
  );
}
