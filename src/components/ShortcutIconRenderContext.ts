import { createContext, useContext } from 'react';

export type ShortcutMonochromeTone = 'theme-adaptive' | 'fixed-white';

type ShortcutIconRenderContextValue = {
  monochromeTone: ShortcutMonochromeTone;
  monochromeTileBackdropBlur: boolean;
};

const DEFAULT_SHORTCUT_ICON_RENDER_CONTEXT: ShortcutIconRenderContextValue = {
  monochromeTone: 'theme-adaptive',
  monochromeTileBackdropBlur: false,
};

export const ShortcutIconRenderContext = createContext<ShortcutIconRenderContextValue>(
  DEFAULT_SHORTCUT_ICON_RENDER_CONTEXT,
);

export function useShortcutIconRenderContext() {
  return useContext(ShortcutIconRenderContext);
}
