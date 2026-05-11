import type {
  LeafTabSyncCommitFile,
  LeafTabSyncManifestFile,
} from './schema';
import { materializeLeafTabSyncSnapshotFromPayloadMap } from './snapshotCodec';

interface EncryptedFileEnvelope {
  kind: 'leaftab-sync-e2ee-file';
  version: 1;
  iv: string;
  ciphertext: string;
}

type WorkerRequest = {
  type: 'materialize';
  payloadMap: Record<string, unknown>;
  commit: Pick<LeafTabSyncCommitFile, 'manifestPath' | 'createdAt' | 'deviceId'>;
} | {
  type: 'decrypt-materialize';
  payloadMap: Record<string, string | null>;
  commit: LeafTabSyncCommitFile;
  keyBytes: number[];
};

const textDecoder = new TextDecoder();

const parseJsonText = <T>(value: string | null | undefined): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const isEncryptedFileEnvelope = (value: unknown): value is EncryptedFileEnvelope => {
  return (
    isRecord(value)
    && value.kind === 'leaftab-sync-e2ee-file'
    && value.version === 1
    && typeof value.iv === 'string'
    && typeof value.ciphertext === 'string'
  );
};

const decodeBase64 = (value: string) => {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    out[index] = binary.charCodeAt(index);
  }
  return out;
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  if (bytes.buffer instanceof ArrayBuffer && bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
    return bytes.buffer;
  }
  return bytes.slice().buffer;
};

const importAesKey = async (keyBytes: Uint8Array) => {
  return crypto.subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );
};

const decryptPayload = async <T>(
  envelope: EncryptedFileEnvelope,
  key: CryptoKey,
): Promise<T> => {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: decodeBase64(envelope.iv),
    },
    key,
    decodeBase64(envelope.ciphertext),
  );
  return JSON.parse(textDecoder.decode(plaintext)) as T;
};

const decryptAndMaterialize = async (
  payloadMap: Record<string, string | null>,
  commit: LeafTabSyncCommitFile,
  keyBytes: Uint8Array,
) => {
  const key = await importAesKey(keyBytes);
  const manifestCandidate = parseJsonText<unknown>(payloadMap[commit.manifestPath] || null);
  const manifestEnvelope = isEncryptedFileEnvelope(manifestCandidate) ? manifestCandidate : null;
  if (!manifestEnvelope) return null;

  const manifest = await decryptPayload<LeafTabSyncManifestFile>(manifestEnvelope, key);
  const materializePayloadMap: Record<string, unknown> = {
    [commit.manifestPath]: manifest,
  };

  await Promise.all(manifest.packs.map(async (pack) => {
    const envelope = parseJsonText<unknown>(payloadMap[pack.path] || null);
    if (!isEncryptedFileEnvelope(envelope)) return;
    materializePayloadMap[pack.path] = await decryptPayload<unknown>(envelope, key);
  }));

  return materializeLeafTabSyncSnapshotFromPayloadMap(materializePayloadMap, commit);
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  void (async () => {
    const request = event.data;
    if (request.type === 'materialize') {
      const snapshot = materializeLeafTabSyncSnapshotFromPayloadMap(request.payloadMap, request.commit);
      self.postMessage({ success: true, snapshot });
      return;
    }

    const snapshot = await decryptAndMaterialize(
      request.payloadMap,
      request.commit,
      new Uint8Array(request.keyBytes),
    );
    self.postMessage({ success: true, snapshot });
  })().catch((error) => {
    self.postMessage({
      success: false,
      error: String((error as Error)?.message || error || 'sync_materialize_worker_failed'),
    });
  });
};
