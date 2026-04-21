import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from 'react';

export const LEAFTAB_RENDER_PROFILER_STORAGE_KEY = 'leaftab_render_profiler';
const LEAFTAB_RENDER_PROFILER_QUERY_KEY = 'leaftabRenderProfiler';

export type RenderProfilerPhase = 'mount' | 'update' | 'nested-update';

export type RenderProfilerRecord = {
  id: string;
  commits: number;
  mountCommits: number;
  updateCommits: number;
  nestedUpdateCommits: number;
  actualDurationTotal: number;
  baseDurationTotal: number;
  maxActualDuration: number;
  lastActualDuration: number;
  lastBaseDuration: number;
  lastStartTime: number;
  lastCommitTime: number;
};

export type RenderProfilerSnapshot = Record<string, RenderProfilerRecord>;

export type RenderProfilerController = {
  enabled: boolean;
  reset: () => void;
  snapshot: () => RenderProfilerSnapshot;
  recordRender: (
    id: string,
    phase: RenderProfilerPhase,
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
  ) => void;
};

declare global {
  interface Window {
    __LEAFTAB_RENDER_PROFILER__?: RenderProfilerController;
  }
}

function createEmptyRecord(id: string): RenderProfilerRecord {
  return {
    id,
    commits: 0,
    mountCommits: 0,
    updateCommits: 0,
    nestedUpdateCommits: 0,
    actualDurationTotal: 0,
    baseDurationTotal: 0,
    maxActualDuration: 0,
    lastActualDuration: 0,
    lastBaseDuration: 0,
    lastStartTime: 0,
    lastCommitTime: 0,
  };
}

function createRenderProfilerController(): RenderProfilerController {
  const records = new Map<string, RenderProfilerRecord>();

  return {
    enabled: true,
    reset: () => {
      records.clear();
    },
    snapshot: () => {
      const snapshot: RenderProfilerSnapshot = {};
      records.forEach((record, id) => {
        snapshot[id] = { ...record };
      });
      return snapshot;
    },
    recordRender: (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      const current = records.get(id) ?? createEmptyRecord(id);
      records.set(id, {
        ...current,
        commits: current.commits + 1,
        mountCommits: current.mountCommits + (phase === 'mount' ? 1 : 0),
        updateCommits: current.updateCommits + (phase === 'update' ? 1 : 0),
        nestedUpdateCommits: current.nestedUpdateCommits + (phase === 'nested-update' ? 1 : 0),
        actualDurationTotal: current.actualDurationTotal + actualDuration,
        baseDurationTotal: current.baseDurationTotal + baseDuration,
        maxActualDuration: Math.max(current.maxActualDuration, actualDuration),
        lastActualDuration: actualDuration,
        lastBaseDuration: baseDuration,
        lastStartTime: startTime,
        lastCommitTime: commitTime,
      });
    },
  };
}

function shouldEnableRenderProfiler() {
  if (typeof window === 'undefined') return false;

  try {
    if (window.localStorage.getItem(LEAFTAB_RENDER_PROFILER_STORAGE_KEY) === '1') {
      return true;
    }
  } catch {}

  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(LEAFTAB_RENDER_PROFILER_QUERY_KEY) === '1';
  } catch {
    return false;
  }
}

function resolveRenderProfilerController() {
  if (typeof window === 'undefined') return null;
  if (!shouldEnableRenderProfiler()) return null;

  if (!window.__LEAFTAB_RENDER_PROFILER__) {
    window.__LEAFTAB_RENDER_PROFILER__ = createRenderProfilerController();
  }

  return window.__LEAFTAB_RENDER_PROFILER__;
}

const handleRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  const controller = resolveRenderProfilerController();
  if (!controller) return;
  controller.recordRender(
    id,
    phase as RenderProfilerPhase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  );
};

export function RenderProfileBoundary({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  if (!shouldEnableRenderProfiler()) {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={handleRender}>
      {children}
    </Profiler>
  );
}
