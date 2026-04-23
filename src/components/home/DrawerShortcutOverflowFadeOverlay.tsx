import {
  BottomCropFadeOverlay,
  resolveBottomCropFadeHeight,
} from '@/components/home/BottomCropFadeOverlay';

const DRAWER_SHORTCUT_OVERFLOW_FADE_HEIGHT_SCALE = 0.72;
const DRAWER_SHORTCUT_OVERFLOW_FADE_MIN_EXTRA_PX = 28;
const DRAWER_SHORTCUT_OVERFLOW_FADE_INSET_SCALE = 0.34;
const DRAWER_SHORTCUT_OVERFLOW_FADE_MIN_INSET_PX = 24;

export function resolveDrawerShortcutOverflowFadeHeight(searchHeight: number) {
  const sharedFadeHeight = resolveBottomCropFadeHeight(searchHeight);
  return Math.max(
    Math.round(searchHeight + DRAWER_SHORTCUT_OVERFLOW_FADE_MIN_EXTRA_PX),
    Math.round(sharedFadeHeight * DRAWER_SHORTCUT_OVERFLOW_FADE_HEIGHT_SCALE),
  );
}

export function resolveDrawerShortcutOverflowFadeInset(searchHeight: number) {
  return Math.max(
    DRAWER_SHORTCUT_OVERFLOW_FADE_MIN_INSET_PX,
    Math.round(resolveDrawerShortcutOverflowFadeHeight(searchHeight) * DRAWER_SHORTCUT_OVERFLOW_FADE_INSET_SCALE),
  );
}

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
