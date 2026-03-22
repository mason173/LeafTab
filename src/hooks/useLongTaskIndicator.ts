import { useCallback, useEffect, useRef, useState } from 'react';

export interface LongTaskIndicatorState {
  id: string;
  title: string;
  detail?: string;
  progress: number;
}

type StartLongTaskOptions = {
  title: string;
  detail?: string;
  progress?: number;
};

type UpdateLongTaskOptions = {
  title?: string;
  detail?: string;
  progress?: number;
};

const clampProgress = (value?: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(Number(value))));
};

export function useLongTaskIndicator() {
  const [task, setTask] = useState<LongTaskIndicatorState | null>(null);
  const clearTimerRef = useRef<number | null>(null);

  const clearPendingTimer = useCallback(() => {
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearPendingTimer();
    };
  }, [clearPendingTimer]);

  const startTask = useCallback((options: StartLongTaskOptions) => {
    clearPendingTimer();
    const id = `long-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTask({
      id,
      title: options.title,
      detail: options.detail,
      progress: clampProgress(options.progress ?? 0),
    });
    return id;
  }, [clearPendingTimer]);

  const updateTask = useCallback((id: string, options: UpdateLongTaskOptions) => {
    setTask((current) => {
      if (!current || current.id !== id) return current;
      return {
        ...current,
        title: typeof options.title === 'string' ? options.title : current.title,
        detail: typeof options.detail === 'string' ? options.detail : current.detail,
        progress: typeof options.progress === 'number'
          ? clampProgress(options.progress)
          : current.progress,
      };
    });
  }, []);

  const finishTask = useCallback((id: string, options?: {
    title?: string;
    detail?: string;
    delayMs?: number;
  }) => {
    clearPendingTimer();
    setTask((current) => {
      if (!current || current.id !== id) return current;
      return {
        ...current,
        title: typeof options?.title === 'string' ? options.title : current.title,
        detail: typeof options?.detail === 'string' ? options.detail : current.detail,
        progress: 100,
      };
    });
    clearTimerRef.current = window.setTimeout(() => {
      setTask((current) => (current?.id === id ? null : current));
      clearTimerRef.current = null;
    }, options?.delayMs ?? 360);
  }, [clearPendingTimer]);

  const clearTask = useCallback((id?: string) => {
    clearPendingTimer();
    setTask((current) => {
      if (!current) return null;
      if (!id || current.id === id) return null;
      return current;
    });
  }, [clearPendingTimer]);

  return {
    task,
    startTask,
    updateTask,
    finishTask,
    clearTask,
  };
}
