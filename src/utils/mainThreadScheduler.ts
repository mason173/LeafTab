export async function yieldToMainThread(): Promise<void> {
  await new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.setTimeout(resolve, 0);
      });
      return;
    }

    setTimeout(resolve, 0);
  });
}

export function scheduleAfterInteractivePaint(
  callback: () => void,
  options?: {
    delayMs?: number;
    idleTimeoutMs?: number;
  },
): () => void {
  const delayMs = Math.max(0, options?.delayMs ?? 64);
  const idleTimeoutMs = Math.max(delayMs, options?.idleTimeoutMs ?? 180);
  let canceled = false;
  let firstRafId = 0;
  let secondRafId = 0;
  let timeoutId = 0;
  let idleId: number | null = null;

  const finish = () => {
    if (canceled) return;
    callback();
  };

  const scheduleIdleWork = () => {
    if (canceled) return;
    const requestIdle = typeof window !== 'undefined'
      ? (window as Window & {
        requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
      }).requestIdleCallback
      : undefined;
    if (typeof requestIdle === 'function') {
      idleId = requestIdle(() => finish(), { timeout: idleTimeoutMs });
      return;
    }

    timeoutId = window.setTimeout(finish, delayMs);
  };

  firstRafId = window.requestAnimationFrame(() => {
    secondRafId = window.requestAnimationFrame(scheduleIdleWork);
  });

  return () => {
    canceled = true;
    if (firstRafId) window.cancelAnimationFrame(firstRafId);
    if (secondRafId) window.cancelAnimationFrame(secondRafId);
    if (timeoutId) window.clearTimeout(timeoutId);
    if (idleId !== null && typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(idleId);
    }
  };
}
