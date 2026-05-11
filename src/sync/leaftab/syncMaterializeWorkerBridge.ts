import type { LeafTabSyncCommitFile, LeafTabSyncSnapshot } from './schema';
import { materializeLeafTabSyncSnapshotFromPayloadMap } from './snapshotCodec';

type MaterializeRequest = {
  type: 'materialize';
  payloadMap: Record<string, unknown>;
  commit: Pick<LeafTabSyncCommitFile, 'manifestPath' | 'createdAt' | 'deviceId'>;
};

type DecryptMaterializeRequest = {
  type: 'decrypt-materialize';
  payloadMap: Record<string, string | null>;
  commit: LeafTabSyncCommitFile;
  keyBytes: number[];
};

type WorkerRequest = MaterializeRequest | DecryptMaterializeRequest;

type WorkerResponse = {
  success: true;
  snapshot: LeafTabSyncSnapshot | null;
} | {
  success: false;
  error: string;
};

let workerUrlPromise: Promise<string | null> | null = null;

const createWorkerUrl = async () => {
  if (workerUrlPromise) return workerUrlPromise;
  workerUrlPromise = (async () => {
    try {
      return (await import('./syncMaterialize.worker?worker&url')).default as string;
    } catch {
      return null;
    }
  })();
  return workerUrlPromise;
};

const canUseWorker = () => {
  try {
    return typeof Worker !== 'undefined';
  } catch {
    return false;
  }
};

const runWorkerRequest = async (request: WorkerRequest): Promise<LeafTabSyncSnapshot | null> => {
  if (!canUseWorker()) {
    throw new Error('worker_unavailable');
  }

  const workerUrl = await createWorkerUrl();
  if (!workerUrl) {
    throw new Error('worker_url_unavailable');
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(workerUrl, { type: 'module' });
    const timeout = globalThis.setTimeout(() => {
      worker.terminate();
      reject(new Error('sync_materialize_worker_timeout'));
    }, 30_000);

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      globalThis.clearTimeout(timeout);
      worker.terminate();
      const response = event.data;
      if (!response?.success) {
        reject(new Error(response?.error || 'sync_materialize_worker_failed'));
        return;
      }
      resolve(response.snapshot);
    };
    worker.onerror = (event) => {
      globalThis.clearTimeout(timeout);
      worker.terminate();
      reject(new Error(event.message || 'sync_materialize_worker_error'));
    };
    worker.postMessage(request);
  });
};

export const materializeLeafTabSyncSnapshotOffMainThread = async (
  payloadMap: Record<string, unknown>,
  commit: Pick<LeafTabSyncCommitFile, 'manifestPath' | 'createdAt' | 'deviceId'>,
) => {
  try {
    return await runWorkerRequest({
      type: 'materialize',
      payloadMap,
      commit,
    });
  } catch {
    return materializeLeafTabSyncSnapshotFromPayloadMap(payloadMap, commit);
  }
};

export const decryptAndMaterializeLeafTabSyncSnapshotOffMainThread = async (
  payloadMap: Record<string, string | null>,
  commit: LeafTabSyncCommitFile,
  keyBytes: Uint8Array,
  fallback: () => Promise<LeafTabSyncSnapshot | null>,
) => {
  try {
    return await runWorkerRequest({
      type: 'decrypt-materialize',
      payloadMap,
      commit,
      keyBytes: Array.from(keyBytes),
    });
  } catch {
    return fallback();
  }
};
