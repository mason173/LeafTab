import { memo, useEffect, useRef, useState } from 'react';
import { useDocumentVisibility } from '@/hooks/useDocumentVisibility';

interface WeatherLoopVideoProps {
  src: string;
  posterSrc?: string;
  className?: string;
  paused?: boolean;
  playbackRate?: number;
  smoothEndRamp?: boolean;
  seamlessLoopDurationSec?: number;
}

const DEFAULT_WRAPPER_CLASS = 'absolute inset-0 h-full w-full object-cover';
const INNER_VIDEO_CLASS = 'absolute inset-0 h-full w-full object-cover';

function playVideo(video: HTMLVideoElement | null) {
  if (!video) return Promise.resolve();
  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    return playPromise.catch(() => {});
  }
  return Promise.resolve();
}

function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 3000) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(cleanupAndResolve, timeoutMs);

    function cleanupAndResolve() {
      window.clearTimeout(timeoutId);
      video.removeEventListener('loadeddata', cleanupAndResolve);
      video.removeEventListener('canplay', cleanupAndResolve);
      video.removeEventListener('error', cleanupAndResolve);
      resolve();
    }

    video.addEventListener('loadeddata', cleanupAndResolve, { once: true });
    video.addEventListener('canplay', cleanupAndResolve, { once: true });
    video.addEventListener('error', cleanupAndResolve, { once: true });
  });
}

function waitForPaintedFrame(video: HTMLVideoElement) {
  return new Promise<void>((resolve) => {
    const candidate = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number;
    };

    if (typeof candidate.requestVideoFrameCallback === 'function') {
      candidate.requestVideoFrameCallback(() => resolve());
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export const WeatherLoopVideo = memo(function WeatherLoopVideo({
  src,
  posterSrc,
  className,
  paused = false,
  playbackRate = 0.7,
  smoothEndRamp = true,
  seamlessLoopDurationSec = 0,
}: WeatherLoopVideoProps) {
  const singleVideoRef = useRef<HTMLVideoElement>(null);
  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const secondaryVideoRef = useRef<HTMLVideoElement>(null);
  const generationRef = useRef(0);
  const preparingRef = useRef(false);
  const activeIndexRef = useRef(0);
  const crossfadingRef = useRef(false);
  const isDocumentVisible = useDocumentVisibility();
  const shouldPause = paused || !isDocumentVisible;
  const seamlessLoopEnabled = seamlessLoopDurationSec > 0;
  const resolvedClassName = className || DEFAULT_WRAPPER_CLASS;
  const [activeIndex, setActiveIndex] = useState(0);
  const [crossfading, setCrossfading] = useState(false);
  const transitionMs = Math.max(0, Math.round(seamlessLoopDurationSec * 1000));

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    crossfadingRef.current = crossfading;
  }, [crossfading]);

  useEffect(() => {
    generationRef.current += 1;
    preparingRef.current = false;
    activeIndexRef.current = 0;
    crossfadingRef.current = false;
    setActiveIndex(0);
    setCrossfading(false);

    const allVideos = [
      singleVideoRef.current,
      primaryVideoRef.current,
      secondaryVideoRef.current,
    ];

    allVideos.forEach((video) => {
      if (!video) return;
      video.pause();
      video.playbackRate = playbackRate;
      try {
        video.currentTime = 0;
      } catch {}
    });
  }, [src, playbackRate]);

  useEffect(() => {
    if (!shouldPause || !posterSrc) return;

    [singleVideoRef.current, primaryVideoRef.current, secondaryVideoRef.current].forEach((video) => {
      if (!video) return;
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
  }, [posterSrc, shouldPause, src]);

  useEffect(() => {
    if (seamlessLoopEnabled) return;

    const video = singleVideoRef.current;
    if (!video) return;
    if (shouldPause) return;

    video.playbackRate = playbackRate;
    if (!smoothEndRamp) {
      return undefined;
    }

    const handleTimeUpdate = () => {
      const timeLeft = video.duration - video.currentTime;
      if (timeLeft > 0 && timeLeft < 1.5) {
        const newRate = Math.max(0.1, playbackRate * (timeLeft / 1.5));
        video.playbackRate = newRate;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [playbackRate, seamlessLoopEnabled, shouldPause, smoothEndRamp, src]);

  useEffect(() => {
    if (seamlessLoopEnabled) return;

    const video = singleVideoRef.current;
    if (!video) return;

    if (shouldPause) {
      video.pause();
      return;
    }

    void playVideo(video);
  }, [seamlessLoopEnabled, shouldPause, src]);

  useEffect(() => {
    if (!seamlessLoopEnabled) return;

    const videos = [primaryVideoRef.current, secondaryVideoRef.current];
    videos.forEach((video) => {
      if (!video) return;
      video.playbackRate = playbackRate;
    });
  }, [playbackRate, seamlessLoopEnabled]);

  useEffect(() => {
    if (!seamlessLoopEnabled) return;

    const activeVideo = activeIndex === 0 ? primaryVideoRef.current : secondaryVideoRef.current;
    const inactiveVideo = activeIndex === 0 ? secondaryVideoRef.current : primaryVideoRef.current;
    if (!activeVideo || !inactiveVideo) return;

    const generationAtMount = generationRef.current;
    const crossfadeDuration = Math.max(0.2, seamlessLoopDurationSec);
    const crossfadeLeadTime = crossfadeDuration + 0.16;

    const beginCrossfade = async () => {
      if (crossfadingRef.current || preparingRef.current || shouldPause) return;
      if (!Number.isFinite(activeVideo.duration) || activeVideo.duration <= crossfadeDuration + 0.1) return;

      preparingRef.current = true;
      inactiveVideo.playbackRate = playbackRate;
      inactiveVideo.pause();

      try {
        inactiveVideo.currentTime = 0;
      } catch {}

      await waitForVideoReady(inactiveVideo);
      if (generationRef.current !== generationAtMount || shouldPause) {
        preparingRef.current = false;
        return;
      }

      await playVideo(inactiveVideo);
      await waitForPaintedFrame(inactiveVideo);
      if (generationRef.current !== generationAtMount || shouldPause) {
        preparingRef.current = false;
        return;
      }

      crossfadingRef.current = true;
      preparingRef.current = false;
      setCrossfading(true);
    };

    const handleTimeUpdate = () => {
      if (crossfadingRef.current || preparingRef.current) return;
      const timeLeft = activeVideo.duration - activeVideo.currentTime;
      if (timeLeft > 0 && timeLeft <= crossfadeLeadTime) {
        void beginCrossfade();
      }
    };

    const handleEnded = () => {
      activeVideo.pause();
      try {
        activeVideo.currentTime = 0;
      } catch {}

      preparingRef.current = false;
      crossfadingRef.current = false;
      setActiveIndex((current) => (current === 0 ? 1 : 0));
      setCrossfading(false);
    };

    activeVideo.addEventListener('timeupdate', handleTimeUpdate);
    activeVideo.addEventListener('ended', handleEnded);

    return () => {
      activeVideo.removeEventListener('timeupdate', handleTimeUpdate);
      activeVideo.removeEventListener('ended', handleEnded);
    };
  }, [activeIndex, playbackRate, seamlessLoopDurationSec, seamlessLoopEnabled, shouldPause, src]);

  useEffect(() => {
    if (!seamlessLoopEnabled) return;

    const primaryVideo = primaryVideoRef.current;
    const secondaryVideo = secondaryVideoRef.current;
    if (!primaryVideo || !secondaryVideo) return;

    if (shouldPause) {
      primaryVideo.pause();
      secondaryVideo.pause();
      return;
    }

    const activeVideo = activeIndex === 0 ? primaryVideo : secondaryVideo;
    const inactiveVideo = activeIndex === 0 ? secondaryVideo : primaryVideo;

    void playVideo(activeVideo);
    if (crossfadingRef.current || preparingRef.current) {
      return;
    }

    inactiveVideo.pause();
  }, [activeIndex, seamlessLoopEnabled, shouldPause, src]);

  if (shouldPause && posterSrc) {
    return (
      <img
        key={posterSrc}
        src={posterSrc}
        alt=""
        aria-hidden="true"
        className={resolvedClassName}
        draggable={false}
      />
    );
  }

  if (!seamlessLoopEnabled) {
    return (
      <video
        key={src}
        ref={singleVideoRef}
        src={shouldPause && posterSrc ? undefined : src}
        className={resolvedClassName}
        autoPlay={!shouldPause}
        loop
        muted
        playsInline
      />
    );
  }

  const primaryOpacity = crossfading
    ? (activeIndex === 0 ? 0 : 1)
    : (activeIndex === 0 ? 1 : 0);
  const secondaryOpacity = crossfading
    ? (activeIndex === 0 ? 1 : 0)
    : (activeIndex === 1 ? 1 : 0);

  return (
    <div className={resolvedClassName}>
      {posterSrc ? (
        <img
          src={posterSrc}
          alt=""
          aria-hidden="true"
          className={INNER_VIDEO_CLASS}
          draggable={false}
        />
      ) : null}
      <video
        ref={primaryVideoRef}
        src={shouldPause && posterSrc ? undefined : src}
        className={INNER_VIDEO_CLASS}
        muted
        playsInline
        preload="auto"
        style={{
          opacity: primaryOpacity,
          transition: `opacity ${transitionMs}ms linear`,
        }}
      />
      <video
        ref={secondaryVideoRef}
        src={shouldPause && posterSrc ? undefined : src}
        className={INNER_VIDEO_CLASS}
        muted
        playsInline
        preload="metadata"
        style={{
          opacity: secondaryOpacity,
          transition: `opacity ${transitionMs}ms linear`,
        }}
      />
    </div>
  );
});
