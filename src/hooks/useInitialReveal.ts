import { useEffect, useState } from 'react';

export function useInitialReveal(disabled = false) {
  const [initialRevealReady, setInitialRevealReady] = useState(disabled);

  useEffect(() => {
    if (disabled) {
      setInitialRevealReady(true);
      return;
    }
    let firstFrameId = 0;
    let secondFrameId = 0;
    firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        setInitialRevealReady(true);
      });
    });
    return () => {
      if (firstFrameId) window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId) window.cancelAnimationFrame(secondFrameId);
    };
  }, [disabled]);

  return initialRevealReady;
}
