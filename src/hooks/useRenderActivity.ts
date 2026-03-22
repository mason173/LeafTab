import { useEffect, useState, type RefObject } from 'react';

type UseRenderActivityOptions = {
  threshold?: number;
};

export function useRenderActivity<T extends Element>(
  ref: RefObject<T | null>,
  options?: UseRenderActivityOptions,
) {
  const threshold = options?.threshold ?? 0.05;
  const [isDocumentVisible, setIsDocumentVisible] = useState(() => (
    typeof document === 'undefined' ? true : !document.hidden
  ));
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setIsIntersecting(entries.some((entry) => entry.isIntersecting));
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return isDocumentVisible && isIntersecting;
}
