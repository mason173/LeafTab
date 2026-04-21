import { useShortcuts } from '@/hooks/useShortcuts';
import type { ShortcutAppController } from '@/features/shortcuts/app/ShortcutAppContext';

type UseShortcutAppControllerParams = Parameters<typeof useShortcuts>;

export function useShortcutAppController(
  ...params: UseShortcutAppControllerParams
): ShortcutAppController {
  return useShortcuts(...params);
}

export const useShortcutAppContextValue = useShortcutAppController;
