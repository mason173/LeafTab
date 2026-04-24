import { FrostedBackdrop } from '@/components/frosted/FrostedBackdrop';

type FakeBlurDrawerSurfaceProps = {
  surfaceNode: HTMLElement | null;
  opacity: number;
  transition: string;
};

export function FakeBlurDrawerSurface({
  surfaceNode,
  opacity,
  transition,
}: FakeBlurDrawerSurfaceProps) {
  return (
    <FrostedBackdrop
      surfaceNode={surfaceNode}
      preset="immersive-drawer"
      opacity={opacity}
      transition={transition}
      imageOverscanPx={96}
      imageScale={1.04}
    />
  );
}
