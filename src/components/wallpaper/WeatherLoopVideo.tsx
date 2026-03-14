import { useEffect, useRef } from 'react';

interface WeatherLoopVideoProps {
  src: string;
  className?: string;
}

export function WeatherLoopVideo({
  src,
  className,
}: WeatherLoopVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
}
