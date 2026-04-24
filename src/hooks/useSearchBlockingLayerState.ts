import { useEffect, useState } from 'react';

const SEARCH_FOCUS_BLOCKING_SELECTOR = [
  '[data-slot="dialog-content"]',
  '[data-slot="alert-dialog-content"]',
  '[data-slot="sheet-content"]',
  '[data-slot="popover-content"]',
  '[data-slot="select-content"]',
  '[data-slot="dropdown-menu-content"]',
].join(', ');

function hasOpenBlockingLayer() {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector(SEARCH_FOCUS_BLOCKING_SELECTOR));
}

export function useSearchBlockingLayerState() {
  const [blockingLayerOpen, setBlockingLayerOpen] = useState(() => hasOpenBlockingLayer());

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const syncBlockingLayerState = () => {
      setBlockingLayerOpen(hasOpenBlockingLayer());
    };

    syncBlockingLayerState();
    document.addEventListener('focusin', syncBlockingLayerState, true);
    document.addEventListener('mousedown', syncBlockingLayerState, true);
    window.addEventListener('keydown', syncBlockingLayerState, true);

    return () => {
      document.removeEventListener('focusin', syncBlockingLayerState, true);
      document.removeEventListener('mousedown', syncBlockingLayerState, true);
      window.removeEventListener('keydown', syncBlockingLayerState, true);
    };
  }, []);

  return blockingLayerOpen;
}
