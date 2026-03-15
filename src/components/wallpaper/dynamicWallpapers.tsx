import type { ReactNode } from 'react';
import { Beams, Galaxy, Iridescence, LightRays, Prism, Silk } from '@/components/react-bits';
import type { DynamicWallpaperEffect } from '@/wallpaper/types';

export type DynamicWallpaperOption = {
  id: DynamicWallpaperEffect;
  label: string;
  staticBackground: string;
};

export const DYNAMIC_WALLPAPER_OPTIONS: DynamicWallpaperOption[] = [
  {
    id: 'prism',
    label: 'Prism',
    staticBackground: 'linear-gradient(140deg, #111827 0%, #1e293b 45%, #64748b 100%)',
  },
  {
    id: 'silk',
    label: 'Silk',
    staticBackground: 'radial-gradient(circle at 20% 15%, #b8acbf 0%, #6b6572 40%, #1f1f23 100%)',
  },
  {
    id: 'light-rays',
    label: 'Light Rays',
    staticBackground: 'linear-gradient(165deg, #f8fafc 0%, #dbeafe 48%, #475569 100%)',
  },
  {
    id: 'beams',
    label: 'Beams',
    staticBackground: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #64748b 100%)',
  },
  {
    id: 'galaxy',
    label: 'Galaxy',
    staticBackground: 'radial-gradient(circle at 30% 18%, #67e8f9 0%, #1e293b 36%, #020617 82%)',
  },
  {
    id: 'iridescence',
    label: 'Iridescence',
    staticBackground: 'linear-gradient(130deg, #fef3c7 0%, #fbcfe8 35%, #bfdbfe 68%, #d9f99d 100%)',
  },
];

export const DYNAMIC_WALLPAPER_LABELS: Record<DynamicWallpaperEffect, string> = {
  prism: 'Prism',
  silk: 'Silk',
  'light-rays': 'Light Rays',
  beams: 'Beams',
  galaxy: 'Galaxy',
  iridescence: 'Iridescence',
};

export type DynamicWallpaperRenderVariant =
  | 'selector-live'
  | 'selector-static'
  | 'hero'
  | 'background'
  | 'background-static';

export function renderDynamicWallpaper(
  effect: DynamicWallpaperEffect,
  variant: DynamicWallpaperRenderVariant,
): ReactNode {
  const isSelectorLive = variant === 'selector-live';
  const isSelectorStatic = variant === 'selector-static';
  const isHero = variant === 'hero';
  const isBackgroundStatic = variant === 'background-static';

  switch (effect) {
    case 'silk': {
      if (isSelectorLive) {
        return (
          <Silk
            speed={3.8}
            scale={0.9}
            color="#4C854C"
            noiseIntensity={1.2}
            rotation={0}
          />
        );
      }
      if (isSelectorStatic || isBackgroundStatic) {
        return (
          <Silk
            speed={isBackgroundStatic ? 4.2 : 3.8}
            scale={isBackgroundStatic ? 0.95 : 0.9}
            color="#4C854C"
            noiseIntensity={isBackgroundStatic ? 1.15 : 1.2}
            rotation={0}
            staticFrame
          />
        );
      }
      if (isHero) {
        return (
          <Silk
            speed={4.4}
            scale={0.95}
            color="#4C854C"
            noiseIntensity={1.2}
            rotation={0}
          />
        );
      }
      return (
        <Silk
          speed={4.2}
          scale={0.95}
          color="#4C854C"
          noiseIntensity={1.15}
          rotation={0}
        />
      );
    }

    case 'light-rays': {
      if (isSelectorLive) {
        return (
          <LightRays
            raysOrigin="top-center"
            raysColor="#ffffff"
            raysSpeed={1.05}
            lightSpread={0.9}
            rayLength={1.5}
            fadeDistance={1}
            saturation={1}
            followMouse={false}
            mouseInfluence={0.06}
            noiseAmount={0.02}
            distortion={0.03}
          />
        );
      }
      if (isSelectorStatic || isBackgroundStatic) {
        return (
          <LightRays
            raysOrigin="top-center"
            raysColor="#ffffff"
            raysSpeed={isBackgroundStatic ? 1.15 : 1.05}
            lightSpread={isBackgroundStatic ? 0.95 : 0.9}
            rayLength={isBackgroundStatic ? 1.6 : 1.5}
            fadeDistance={1}
            saturation={1}
            followMouse={false}
            mouseInfluence={isBackgroundStatic ? 0.08 : 0.06}
            noiseAmount={isBackgroundStatic ? 0.04 : 0.02}
            distortion={isBackgroundStatic ? 0.04 : 0.03}
            staticFrame
          />
        );
      }
      return (
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={1.15}
          lightSpread={0.95}
          rayLength={1.6}
          fadeDistance={1}
          saturation={1}
          followMouse
          mouseInfluence={0.08}
          noiseAmount={0.04}
          distortion={0.04}
        />
      );
    }

    case 'beams': {
      if (isSelectorLive) {
        return (
          <Beams
            beamWidth={2}
            beamHeight={15}
            beamNumber={10}
            lightColor="#ffffff"
            speed={1.8}
            noiseIntensity={1.4}
            scale={0.2}
            rotation={0}
          />
        );
      }
      if (isSelectorStatic || isBackgroundStatic) {
        return (
          <Beams
            beamWidth={2}
            beamHeight={15}
            beamNumber={isBackgroundStatic ? 12 : 10}
            lightColor="#ffffff"
            speed={isBackgroundStatic ? 2 : 1.8}
            noiseIntensity={isBackgroundStatic ? 1.75 : 1.4}
            scale={0.2}
            rotation={0}
            staticFrame
          />
        );
      }
      return (
        <Beams
          beamWidth={2}
          beamHeight={15}
          beamNumber={12}
          lightColor="#ffffff"
          speed={2}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={0}
        />
      );
    }

    case 'galaxy': {
      if (isSelectorLive) {
        return (
          <Galaxy
            density={1.2}
            glowIntensity={0.35}
            saturation={0.5}
            hueShift={165}
            mouseRepulsion
            mouseInteraction
          />
        );
      }
      if (isSelectorStatic || isBackgroundStatic) {
        return (
          <Galaxy
            density={1.2}
            glowIntensity={0.35}
            saturation={0.5}
            hueShift={165}
            mouseRepulsion
            mouseInteraction={false}
            disableAnimation
          />
        );
      }
      return (
        <Galaxy
          density={1.2}
          glowIntensity={0.35}
          saturation={0.5}
          hueShift={165}
          mouseRepulsion
          mouseInteraction
        />
      );
    }

    case 'iridescence': {
      if (isSelectorLive) {
        return (
          <Iridescence
            color={[1, 1, 1]}
            mouseReact={false}
            amplitude={0.08}
            speed={1}
          />
        );
      }
      if (isSelectorStatic || isBackgroundStatic) {
        return (
          <Iridescence
            color={[1, 1, 1]}
            mouseReact={false}
            amplitude={0.08}
            speed={1}
            staticFrame
          />
        );
      }
      return (
        <Iridescence
          color={[1, 1, 1]}
          mouseReact
          amplitude={0.08}
          speed={1}
        />
      );
    }

    case 'prism':
    default: {
      if (isSelectorLive) {
        return (
          <Prism
            animationType="rotate"
            timeScale={0.35}
            scale={3.1}
            noise={0.35}
            glow={1}
            suspendWhenOffscreen
          />
        );
      }
      if (isSelectorStatic || isBackgroundStatic) {
        return (
          <Prism
            animationType="rotate"
            timeScale={0}
            scale={isBackgroundStatic ? 3.8 : 3.1}
            noise={isBackgroundStatic ? 0.35 : 0}
            glow={1}
            suspendWhenOffscreen
          />
        );
      }
      if (isHero) {
        return (
          <Prism
            animationType="rotate"
            timeScale={0.35}
            scale={3.4}
            noise={0.35}
            glow={1}
          />
        );
      }
      return (
        <Prism
          animationType="rotate"
          timeScale={0.35}
          scale={3.8}
          noise={0.35}
          glow={1}
          suspendWhenOffscreen
        />
      );
    }
  }
}
