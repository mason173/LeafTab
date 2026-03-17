import { useEffect, useMemo, useState } from 'react';

export function useRotatingText(items: string[], intervalMs = 1800, disabled = false): string {
  const normalizedItems = useMemo(
    () => items.map((item) => item.trim()).filter((item) => item.length > 0),
    [items],
  );
  const [index, setIndex] = useState(0);

  const itemsKey = useMemo(() => normalizedItems.join('\u0001'), [normalizedItems]);

  useEffect(() => {
    setIndex(0);
  }, [itemsKey]);

  useEffect(() => {
    if (disabled) return;
    if (normalizedItems.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % normalizedItems.length);
    }, Math.max(500, intervalMs));
    return () => window.clearInterval(timer);
  }, [disabled, intervalMs, normalizedItems]);

  if (normalizedItems.length === 0) return '';
  if (disabled) return normalizedItems[0];
  return normalizedItems[index] ?? normalizedItems[0];
}
