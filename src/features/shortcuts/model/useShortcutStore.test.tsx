import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultScenarioModes } from '@/scenario/scenario';
import type { ScenarioMode, ScenarioShortcuts, Shortcut } from '@/types';
import { persistLocalProfileSnapshot } from '@/utils/localProfileStorage';
import { useShortcutStore } from './useShortcutStore';

function createShortcut(id: string, title: string, url: string): Shortcut {
  return {
    id,
    title,
    url,
    icon: '',
  };
}

describe('useShortcutStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hydrates from the local profile snapshot and switches derived shortcuts by scenario', () => {
    const workMode: ScenarioMode = {
      id: 'work-mode',
      name: 'Work',
      color: '#123456',
      icon: 'briefcase',
    };
    const scenarioModes = [...defaultScenarioModes, workMode];
    const scenarioShortcuts: ScenarioShortcuts = {
      [defaultScenarioModes[0].id]: [createShortcut('life-1', 'Life', 'https://life.example')],
      [workMode.id]: [createShortcut('work-1', 'Work', 'https://work.example')],
    };

    persistLocalProfileSnapshot({
      scenarioModes,
      selectedScenarioId: workMode.id,
      scenarioShortcuts,
    });

    const onScenarioShortcutsDirty = vi.fn();
    const { result } = renderHook(() => useShortcutStore({
      normalizeScenarioModesList: (raw) => raw as ScenarioMode[],
      normalizeScenarioShortcuts: (raw) => raw as ScenarioShortcuts,
      defaultScenarioShortcuts: {},
      onScenarioShortcutsDirty,
    }));

    expect(result.current.scenarioModes).toEqual(scenarioModes);
    expect(result.current.selectedScenarioId).toBe(workMode.id);
    expect(result.current.shortcuts).toEqual(scenarioShortcuts[workMode.id]);

    act(() => {
      result.current.setSelectedScenarioId(defaultScenarioModes[0].id);
    });

    expect(result.current.shortcuts).toEqual(scenarioShortcuts[defaultScenarioModes[0].id]);

    act(() => {
      result.current.updateScenarioShortcuts((prev) => [
        ...prev,
        createShortcut('life-2', 'Docs', 'https://docs.example'),
      ]);
    });

    expect(onScenarioShortcutsDirty).toHaveBeenCalledTimes(1);
    expect(result.current.scenarioShortcuts[defaultScenarioModes[0].id]).toHaveLength(2);
    expect(result.current.totalShortcuts).toBe(3);
  });
});
