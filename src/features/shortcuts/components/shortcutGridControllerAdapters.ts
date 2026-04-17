import { useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import type { ShortcutMonochromeTone } from '@/components/ShortcutIconRenderContext';
import { useObservedElementValue } from '@/features/shortcuts/drag/useObservedElementValue';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';

export function useShortcutGridSceneRefs() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  return {
    wrapperRef,
    rootRef,
  };
}

export function useShortcutGridFirefoxBuildTarget() {
  return isFirefoxBuildTarget();
}

export function useShortcutIconRenderContextValue(params: {
  monochromeTone: ShortcutMonochromeTone;
  monochromeTileBackdropBlur: boolean;
}) {
  return useMemo(() => ({
    monochromeTone: params.monochromeTone,
    monochromeTileBackdropBlur: params.monochromeTileBackdropBlur,
  }), [params.monochromeTileBackdropBlur, params.monochromeTone]);
}

export function useObservedRootGridWidth(wrapperRef: RefObject<HTMLDivElement | null>) {
  return useObservedElementValue<number | null>({
    elementRef: wrapperRef,
    initialValue: null,
    computeValue: (element) => Math.round(element.clientWidth),
  });
}

export function useObservedFolderGridColumns(wrapperRef: RefObject<HTMLDivElement | null>) {
  return useObservedElementValue({
    elementRef: wrapperRef,
    initialValue: 4,
    computeValue: (element) => (element.clientWidth >= 640 ? 4 : 3),
  });
}
