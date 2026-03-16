import { useEffect, useState } from 'react';

export function useInitialReveal() {
  const [initialRevealReady, setInitialRevealReady] = useState(false);

  useEffect(() => {
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
  }, []);

  return initialRevealReady;
}
