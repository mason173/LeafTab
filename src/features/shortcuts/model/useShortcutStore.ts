import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { defaultScenarioModes, SCENARIO_SELECTED_KEY } from '@/scenario/scenario';
import { readLocalProfileSnapshot } from '@/utils/localProfileStorage';
import { countShortcutLinks } from '@/utils/shortcutFolders';
import type {
  NormalizeScenarioModesList,
  NormalizeScenarioShortcuts,
  UseShortcutStoreParams,
  UseShortcutStoreResult,
} from './types';

function resolveInitialScenarioModes(
  initialLocalProfile: ReturnType<typeof readLocalProfileSnapshot>,
  normalizeScenarioModesList: NormalizeScenarioModesList,
) {
  if (initialLocalProfile?.scenarioModes?.length) {
    return normalizeScenarioModesList(initialLocalProfile.scenarioModes);
  }
  return defaultScenarioModes;
}

function resolveInitialSelectedScenarioId(
  initialLocalProfile: ReturnType<typeof readLocalProfileSnapshot>,
) {
  if (initialLocalProfile?.selectedScenarioId) {
    return initialLocalProfile.selectedScenarioId;
  }
  const cached = localStorage.getItem(SCENARIO_SELECTED_KEY);
  return cached || defaultScenarioModes[0].id;
}

function resolveInitialScenarioShortcuts(
  initialLocalProfile: ReturnType<typeof readLocalProfileSnapshot>,
  normalizeScenarioShortcuts: NormalizeScenarioShortcuts,
  defaultScenarioShortcuts: unknown,
) {
  if (initialLocalProfile?.scenarioShortcuts) {
    const normalized = normalizeScenarioShortcuts(initialLocalProfile.scenarioShortcuts);
    if (Object.keys(normalized).length) {
      return normalized;
    }
  }

  const initial = normalizeScenarioShortcuts(defaultScenarioShortcuts);
  if (Object.keys(initial).length) {
    return initial;
  }

  return { [defaultScenarioModes[0].id]: [] };
}

export function useShortcutStore({
  normalizeScenarioModesList,
  normalizeScenarioShortcuts,
  defaultScenarioShortcuts,
  onScenarioShortcutsDirty,
}: UseShortcutStoreParams): UseShortcutStoreResult {
  const initialLocalProfile = readLocalProfileSnapshot();

  const [scenarioModes, setScenarioModesState] = useState(() => (
    resolveInitialScenarioModes(initialLocalProfile, normalizeScenarioModesList)
  ));
  const [selectedScenarioId, setSelectedScenarioIdState] = useState(() => (
    resolveInitialSelectedScenarioId(initialLocalProfile)
  ));
  const [scenarioShortcuts, setScenarioShortcutsState] = useState(() => (
    resolveInitialScenarioShortcuts(
      initialLocalProfile,
      normalizeScenarioShortcuts,
      defaultScenarioShortcuts,
    )
  ));

  const scenarioModesRef = useRef(scenarioModes);
  const selectedScenarioIdRef = useRef(selectedScenarioId);
  const scenarioShortcutsRef = useRef(scenarioShortcuts);

  const setScenarioModes = useCallback<Dispatch<SetStateAction<typeof scenarioModes>>>((nextValue) => {
    setScenarioModesState((prev) => {
      const resolved = typeof nextValue === 'function'
        ? nextValue(prev)
        : nextValue;
      scenarioModesRef.current = resolved;
      return resolved;
    });
  }, []);

  const setSelectedScenarioId = useCallback<Dispatch<SetStateAction<string>>>((nextValue) => {
    setSelectedScenarioIdState((prev) => {
      const resolved = typeof nextValue === 'function'
        ? nextValue(prev)
        : nextValue;
      selectedScenarioIdRef.current = resolved;
      return resolved;
    });
  }, []);

  const setScenarioShortcuts = useCallback<Dispatch<SetStateAction<typeof scenarioShortcuts>>>((nextValue) => {
    setScenarioShortcutsState((prev) => {
      const resolved = typeof nextValue === 'function'
        ? nextValue(prev)
        : nextValue;
      scenarioShortcutsRef.current = resolved;
      return resolved;
    });
  }, []);

  const shortcuts = useMemo(
    () => scenarioShortcuts[selectedScenarioId] ?? [],
    [scenarioShortcuts, selectedScenarioId],
  );

  const totalShortcuts = useMemo(() => {
    let count = 0;
    Object.values(scenarioShortcuts).forEach((list) => {
      if (Array.isArray(list)) {
        count += countShortcutLinks(list);
      }
    });
    return count;
  }, [scenarioShortcuts]);

  const updateScenarioShortcuts = useCallback((updater: (prev: typeof shortcuts) => typeof shortcuts) => {
    const currentScenarioId = selectedScenarioIdRef.current;
    const currentShortcutsMap = scenarioShortcutsRef.current;
    const current = currentShortcutsMap[currentScenarioId] ?? [];
    const nextCurrent = updater(current);
    if (nextCurrent === current) {
      return;
    }

    onScenarioShortcutsDirty?.();
    setScenarioShortcuts({
      ...currentShortcutsMap,
      [currentScenarioId]: nextCurrent,
    });
  }, [onScenarioShortcutsDirty, setScenarioShortcuts]);

  useEffect(() => {
    setScenarioShortcuts((prev) => {
      if (prev[selectedScenarioId]) {
        return prev;
      }
      return { ...prev, [selectedScenarioId]: [] };
    });
  }, [selectedScenarioId, setScenarioShortcuts]);

  return {
    scenarioModes,
    selectedScenarioId,
    scenarioShortcuts,
    shortcuts,
    totalShortcuts,
    scenarioModesRef,
    selectedScenarioIdRef,
    scenarioShortcutsRef,
    setScenarioModes,
    setSelectedScenarioId,
    setScenarioShortcuts,
    updateScenarioShortcuts,
  };
}
