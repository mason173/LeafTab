import { memo, useEffect, useRef } from 'react';
import { useDocumentVisibility } from '@/hooks/useDocumentVisibility';

interface WeatherLoopVideoProps {
  src: string;
  className?: string;
  paused?: boolean;
}

export const WeatherLoopVideo = memo(function WeatherLoopVideo({
  src,
  className,
  paused = false,
}: WeatherLoopVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isDocumentVisible = useDocumentVisibility();
  const shouldPause = paused || !isDocumentVisible;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = 0.7;
    const handleTimeUpdate = () => {
      const timeLeft = video.duration - video.currentTime;
      if (timeLeft > 0 && timeLeft < 1.5) {
        const newRate = Math.max(0.1, 0.7 * (timeLeft / 1.5));
        video.playbackRate = newRate;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (shouldPause) {
      video.pause();
      return;
    }

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }, [shouldPause, src]);

  return (
    <video
      key={src}
      ref={videoRef}
      src={src}
      className={className || 'absolute w-full h-full object-cover'}
      autoPlay
      muted
      playsInline
    />
  );
});
