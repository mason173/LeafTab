import { useEffect, useState } from 'react';

export function useDocumentElementById(id: string, enabled: boolean) {
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      setNode(null);
      return;
    }

    const syncNode = () => {
      const nextNode = document.getElementById(id);
      setNode((current) => (current === nextNode ? current : nextNode));
    };

    syncNode();

    const observer = new MutationObserver(() => {
      syncNode();
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['id'],
    });

    return () => {
      observer.disconnect();
    };
  }, [enabled, id]);

  return node;
}
