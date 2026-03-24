import {
  AI_BOOKMARK_MODEL_CACHE_NAME,
  AI_BOOKMARK_MODEL_ASSET_OVERRIDE_QUERY_PARAM,
  AI_BOOKMARK_MODEL_ASSET_OVERRIDE_STORAGE_KEY,
  AI_BOOKMARK_MODEL_REGISTRY,
} from '@/features/ai-bookmarks/constants';
import type { AiBookmarkModelDefinition, AiBookmarkModelId } from '@/features/ai-bookmarks/types';
import { getExtensionRuntime } from '@/platform/runtime';

type TensorLike = {
  data?: ArrayLike<number>;
  dims?: number[];
};

type FeatureExtractionPipeline = (
  input: string | string[],
  options?: Record<string, unknown>,
) => Promise<TensorLike>;

type ModelAssetSource = {
  baseUrl: string;
  cacheKey: string;
  localFilesOnly: boolean;
};

type ModelLoadOptions = {
  model: string;
  localFilesOnly: boolean;
  remoteHost?: string;
  remotePathTemplate?: string;
};

export type AiBookmarkModelPersistenceState = {
  cacheState: 'packaged-local' | 'persisted-cache' | 'remote-download';
  persistedLocally: boolean;
};

type TransformersProgressInfo = {
  status?: string;
  file?: string;
  progress?: number;
};

export type AiBookmarkModelLoadProgress = {
  progress: number;
  label: string;
};

let transformersImportPromise: Promise<typeof import('@huggingface/transformers')> | null = null;
const pipelineCache = new Map<string, Promise<FeatureExtractionPipeline>>();
const modelAvailabilityCache = new Map<string, Promise<boolean>>();
const modelSourceCache = new Map<string, Promise<{
  source: ModelAssetSource;
  persistedLocally: boolean;
  cacheState: AiBookmarkModelPersistenceState['cacheState'];
}>>();
let modelAssetCachePromise: Promise<Cache | null> | null = null;

function normalizeAssetPath(value: string): string {
  return String(value || '').trim().replace(/^\/+/, '');
}

function getAssetWeight(filePath: string): number {
  const normalized = normalizeAssetPath(filePath);
  if (normalized.endsWith('onnx/model_quantized.onnx')) return 0.78;
  if (normalized.endsWith('tokenizer.json')) return 0.08;
  if (normalized.endsWith('unigram.json') || normalized.endsWith('vocab.txt')) return 0.06;
  if (normalized.endsWith('tokenizer_config.json')) return 0.04;
  if (normalized.endsWith('config.json')) return 0.02;
  if (normalized.endsWith('special_tokens_map.json')) return 0.02;
  return 0.04;
}

function createModelLoadProgressReporter(
  definition: AiBookmarkModelDefinition,
  options?: {
    persistedLocally?: boolean;
    onProgress?: (progress: AiBookmarkModelLoadProgress) => void;
  },
) {
  const onProgress = options?.onProgress;
  if (!onProgress) return undefined;
  const persistedLocally = Boolean(options?.persistedLocally);

  const assetProgress = new Map<string, number>();
  getRequiredModelAssetFiles(definition).forEach((file) => {
    assetProgress.set(normalizeAssetPath(file), 0);
  });

  const emit = (progress: number, label: string) => {
    onProgress({
      progress: Math.max(0, Math.min(100, Math.round(progress))),
      label,
    });
  };

  return (event: TransformersProgressInfo) => {
    const filePath = normalizeAssetPath(event.file || '');
    if (filePath && !assetProgress.has(filePath)) {
      assetProgress.set(filePath, 0);
    }

    if (event.status === 'download') {
      emit(
        persistedLocally ? 12 : 2,
        persistedLocally
          ? `正在加载本地 AI 模型资源：${filePath || '准备中'}...`
          : `首次使用正在联网下载 AI 模型资源：${filePath || '准备中'}...`,
      );
      return;
    }

    if (event.status === 'progress') {
      if (filePath) {
        assetProgress.set(filePath, Number.isFinite(event.progress) ? Number(event.progress) : 0);
      }
      let totalWeight = 0;
      let weightedProgress = 0;
      for (const [asset, assetPercent] of assetProgress.entries()) {
        const weight = getAssetWeight(asset);
        totalWeight += weight;
        weightedProgress += weight * Math.max(0, Math.min(100, assetPercent));
      }
      const progress = totalWeight > 0 ? weightedProgress / totalWeight : Number(event.progress || 0);
      emit(
        progress,
        persistedLocally
          ? `正在加载本地 AI 模型资源：${filePath || '准备中'}...`
          : `首次使用正在联网下载 AI 模型资源：${filePath || '准备中'}...`,
      );
      return;
    }

    if (event.status === 'done') {
      if (filePath) assetProgress.set(filePath, 100);
      const finishedCount = Array.from(assetProgress.values()).filter((value) => value >= 100).length;
      const totalCount = Math.max(assetProgress.size, 1);
      emit(
        Math.round((finishedCount / totalCount) * 100),
        persistedLocally
          ? '本地 AI 模型加载完成，正在准备索引环境...'
          : 'AI 模型资源下载完成，正在准备索引环境...',
      );
      return;
    }

    if (event.status === 'ready') {
      emit(100, persistedLocally ? '本地 AI 模型已就绪' : 'AI 模型已就绪');
    }
  };
}

function getTransformersModule() {
  if (!transformersImportPromise) {
    transformersImportPromise = import('@huggingface/transformers');
  }
  return transformersImportPromise;
}

function getRequiredModelAssetFiles(definition: AiBookmarkModelDefinition): string[] {
  const files = definition.remoteAssetFiles?.length
    ? definition.remoteAssetFiles
    : [
        'config.json',
        'tokenizer.json',
        'tokenizer_config.json',
        'special_tokens_map.json',
        `onnx/${definition.modelFileName}`,
      ];

  return Array.from(new Set(files.map(normalizeAssetPath).filter(Boolean)));
}

function isRemoteModelSource(source: ModelAssetSource): boolean {
  return !source.localFilesOnly;
}

function resolveRuntimeAssetUrl(relativePath: string): string {
  const runtime = getExtensionRuntime();
  if (runtime?.getURL) return runtime.getURL(relativePath);
  const pathname = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return new URL(pathname, window.location.href).toString();
}

function normalizeModelAssetBaseUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
      return new URL(trimmed).toString().replace(/\/+$/, '');
    }
    return new URL(trimmed, window.location.href).toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readModelAssetOverridesFromStorage(): Partial<Record<AiBookmarkModelId, string>> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(AI_BOOKMARK_MODEL_ASSET_OVERRIDE_STORAGE_KEY) || '';
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) return {};

    const overrides: Partial<Record<AiBookmarkModelId, string>> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'string') continue;
      const normalized = normalizeModelAssetBaseUrl(value);
      if (!normalized) continue;
      overrides[key as AiBookmarkModelId] = normalized;
    }
    return overrides;
  } catch {
    return {};
  }
}

function readModelAssetOverridesFromQuery(): Partial<Record<AiBookmarkModelId, string>> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = new URLSearchParams(window.location.search).get(AI_BOOKMARK_MODEL_ASSET_OVERRIDE_QUERY_PARAM) || '';
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) return {};

    const overrides: Partial<Record<AiBookmarkModelId, string>> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'string') continue;
      const normalized = normalizeModelAssetBaseUrl(value);
      if (!normalized) continue;
      overrides[key as AiBookmarkModelId] = normalized;
    }
    return overrides;
  } catch {
    return {};
  }
}

function getModelAssetSourceCandidates(modelId: AiBookmarkModelId): ModelAssetSource[] {
  const definition = AI_BOOKMARK_MODEL_REGISTRY[modelId];
  const queryOverrides = readModelAssetOverridesFromQuery();
  const storageOverrides = readModelAssetOverridesFromStorage();
  const override = queryOverrides[modelId] || storageOverrides[modelId];
  if (override) {
    return [{
      baseUrl: override,
      cacheKey: `${modelId}::${override}`,
      localFilesOnly: false,
    }];
  }

  const candidates: ModelAssetSource[] = [];
  if (definition.remoteModelBaseUrl) {
    candidates.push({
      baseUrl: definition.remoteModelBaseUrl.replace(/\/+$/, ''),
      cacheKey: `${modelId}::remote::${definition.remoteModelBaseUrl.replace(/\/+$/, '')}`,
      localFilesOnly: false,
    });
  }

  candidates.push({
    baseUrl: resolveRuntimeAssetUrl(definition.modelPath).replace(/\/+$/, ''),
    cacheKey: `${modelId}::local`,
    localFilesOnly: true,
  });

  return candidates;
}

function resolveModelAssetUrl(source: ModelAssetSource, relativePath: string): string {
  return new URL(relativePath.replace(/^\/+/, ''), `${source.baseUrl}/`).toString();
}

async function configureTransformersEnvironment() {
  const { env } = await getTransformersModule();
  const customCache = await getModelAssetCacheAdapter();
  env.useBrowserCache = false;
  env.useCustomCache = Boolean(customCache);
  env.customCache = customCache;
  env.backends.onnx.wasm.proxy = false;
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.wasmPaths = {
    mjs: resolveRuntimeAssetUrl('ort/ort-wasm-simd-threaded.mjs'),
    wasm: resolveRuntimeAssetUrl('ort/ort-wasm-simd-threaded.wasm'),
  };

  return env;
}

async function getModelAssetCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null;
  if (!modelAssetCachePromise) {
    modelAssetCachePromise = (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((name) => name.startsWith('leaftab-transformers-cache-') && name !== AI_BOOKMARK_MODEL_CACHE_NAME)
            .map((name) => caches.delete(name)),
        );
        return await caches.open(AI_BOOKMARK_MODEL_CACHE_NAME);
      } catch (error) {
        console.warn('[ai-bookmarks] unable to open model cache', error);
        return null;
      }
    })().catch((error) => {
      modelAssetCachePromise = null;
      throw error;
    });
  }

  return modelAssetCachePromise;
}

async function getModelAssetCacheAdapter() {
  const cache = await getModelAssetCache();
  if (!cache) return null;

  return {
    async match(request: RequestInfo | URL) {
      return (await cache.match(request)) ?? undefined;
    },
    async put(request: RequestInfo | URL, response: Response) {
      await cache.put(request, response);
    },
  };
}

async function hasCachedRemoteAsset(url: string): Promise<boolean> {
  const cache = await getModelAssetCache();
  if (!cache) return false;
  return (await cache.match(url)) !== undefined;
}

async function fileExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-cache',
    });
    return response.ok;
  } catch {}

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Range: 'bytes=0-0',
      },
      cache: 'no-cache',
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function hasBundledRuntimeAssets(): Promise<boolean> {
  const checks = await Promise.all([
    fileExists(resolveRuntimeAssetUrl('ort/ort-wasm-simd-threaded.mjs')),
    fileExists(resolveRuntimeAssetUrl('ort/ort-wasm-simd-threaded.wasm')),
    fileExists(resolveRuntimeAssetUrl('ort/ort-wasm-simd-threaded.jsep.mjs')),
    fileExists(resolveRuntimeAssetUrl('ort/ort-wasm-simd-threaded.jsep.wasm')),
  ]);
  return checks.every(Boolean);
}

async function hasModelAssetsAtSource(
  source: ModelAssetSource,
  definition: AiBookmarkModelDefinition,
): Promise<boolean> {
  if (isRemoteModelSource(source)) return true;
  const files = getRequiredModelAssetFiles(definition);
  const checks = await Promise.all(
    files.map((file) => fileExists(resolveModelAssetUrl(source, file))),
  );
  return checks.every(Boolean);
}

async function hasPersistedRemoteModelAssets(
  source: ModelAssetSource,
  definition: AiBookmarkModelDefinition,
): Promise<boolean> {
  if (!isRemoteModelSource(source)) return false;

  const files = getRequiredModelAssetFiles(definition);
  const checks = await Promise.all(
    files.map((file) => hasCachedRemoteAsset(resolveModelAssetUrl(source, file))),
  );
  return checks.every(Boolean);
}

async function hasModelAssets(modelId: AiBookmarkModelId): Promise<boolean> {
  const source = await getModelAssetSource(modelId);
  const cached = modelAvailabilityCache.get(source.cacheKey);
  if (cached) return cached;

  const next = (async () => {
    const definition = AI_BOOKMARK_MODEL_REGISTRY[modelId];
    const [sourceReady, runtimeReady] = await Promise.all([
      isRemoteModelSource(source)
        ? true
        : hasModelAssetsAtSource(source, definition),
      hasBundledRuntimeAssets(),
    ]);
    return sourceReady && runtimeReady;
  })();
  modelAvailabilityCache.set(source.cacheKey, next);

  try {
    return await next;
  } catch (error) {
    modelAvailabilityCache.delete(source.cacheKey);
    throw error;
  }
}

async function getModelAssetSource(modelId: AiBookmarkModelId): Promise<ModelAssetSource> {
  return (await inspectBookmarkModelPersistenceState(modelId)).source;
}

async function inspectBookmarkModelPersistenceState(modelId: AiBookmarkModelId): Promise<{
  source: ModelAssetSource;
  persistedLocally: boolean;
  cacheState: AiBookmarkModelPersistenceState['cacheState'];
}> {
  const cacheKey = [
    modelId,
    JSON.stringify(readModelAssetOverridesFromQuery()),
    JSON.stringify(readModelAssetOverridesFromStorage()),
  ].join('::');
  const cached = modelSourceCache.get(cacheKey);
  if (cached) return cached;

  const definition = AI_BOOKMARK_MODEL_REGISTRY[modelId];
  const next = (async () => {
    const candidates = getModelAssetSourceCandidates(modelId);
    for (const source of candidates) {
      if (source.localFilesOnly) {
        if (await hasModelAssetsAtSource(source, definition)) {
          return {
            source,
            persistedLocally: true,
            cacheState: 'packaged-local' as const,
          };
        }
        continue;
      }

      if (await hasPersistedRemoteModelAssets(source, definition)) {
        return {
          source,
          persistedLocally: true,
          cacheState: 'persisted-cache' as const,
        };
      }

      return {
        source,
        persistedLocally: false,
        cacheState: 'remote-download' as const,
      };
    }
    throw new Error(`local_model_assets_missing:${modelId}`);
  })().catch((error) => {
    modelSourceCache.delete(cacheKey);
    throw error;
  });

  modelSourceCache.set(cacheKey, next);
  return next;
}

export async function inspectBookmarkModelPersistence(
  modelId: AiBookmarkModelId,
): Promise<AiBookmarkModelPersistenceState> {
  const result = await inspectBookmarkModelPersistenceState(modelId);
  return {
    cacheState: result.cacheState,
    persistedLocally: result.persistedLocally,
  };
}

async function loadFeatureExtractionPipeline(
  modelId: AiBookmarkModelId,
  definition: AiBookmarkModelDefinition,
  options?: {
    onProgress?: (progress: AiBookmarkModelLoadProgress) => void;
  },
): Promise<FeatureExtractionPipeline> {
  const { pipeline } = await getTransformersModule();
  const sourceState = await inspectBookmarkModelPersistenceState(modelId);
  const source = sourceState.source;
  const modelBaseName = definition.modelFileName
    .replace(/_quantized\.onnx$/i, '')
    .replace(/\.onnx$/i, '');
  const modelLoadOptions = buildModelLoadOptions({
    modelId,
    definition,
    source,
  });
  const env = await configureTransformersEnvironment();

  env.allowLocalModels = modelLoadOptions.localFilesOnly;
  env.allowRemoteModels = !modelLoadOptions.localFilesOnly;
  if (modelLoadOptions.remoteHost) {
    env.remoteHost = modelLoadOptions.remoteHost;
  }
  if (typeof modelLoadOptions.remotePathTemplate === 'string') {
    env.remotePathTemplate = modelLoadOptions.remotePathTemplate;
  }

  return pipeline('feature-extraction', modelLoadOptions.model, {
    progress_callback: createModelLoadProgressReporter(definition, {
      persistedLocally: sourceState.persistedLocally,
      onProgress: options?.onProgress,
    }),
    local_files_only: modelLoadOptions.localFilesOnly,
    subfolder: 'onnx',
    model_file_name: modelBaseName,
    dtype: 'q8',
    device: 'wasm',
  }) as Promise<FeatureExtractionPipeline>;
}

function buildModelLoadOptions(args: {
  modelId: AiBookmarkModelId;
  definition: AiBookmarkModelDefinition;
  source: ModelAssetSource;
}): ModelLoadOptions {
  if (args.source.localFilesOnly) {
    return {
      model: args.definition.modelPath,
      localFilesOnly: true,
    };
  }

  const remoteUrl = new URL(args.source.baseUrl);
  const remotePath = remoteUrl.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  return {
    // transformers.js requires a syntactically valid model id before it will
    // attempt a remote fetch, even when the remote path template ignores it.
    model: `leaftab/${args.modelId}`,
    localFilesOnly: false,
    remoteHost: `${remoteUrl.origin}/`,
    remotePathTemplate: remotePath ? `${remotePath}/` : '',
  };
}

function getEmbeddingDimensions(tensor: TensorLike, inputCount: number): {
  batchSize: number;
  vectorSize: number;
} {
  const dims = tensor.dims || [];
  if (dims.length >= 2) {
    return {
      batchSize: Number(dims[0]) || inputCount,
      vectorSize: Number(dims[dims.length - 1]) || 0,
    };
  }
  const totalValues = Number(tensor.data?.length || 0);
  return {
    batchSize: inputCount,
    vectorSize: inputCount > 0 ? Math.floor(totalValues / inputCount) : 0,
  };
}

function splitTensorEmbeddings(tensor: TensorLike, inputCount: number): number[][] {
  const data = Array.from(tensor.data || []);
  if (inputCount <= 0) return [];
  if (inputCount === 1) return [data];

  const { batchSize, vectorSize } = getEmbeddingDimensions(tensor, inputCount);
  if (batchSize <= 1 || vectorSize <= 0) return [data];

  const out: number[][] = [];
  for (let index = 0; index < batchSize; index += 1) {
    const start = index * vectorSize;
    out.push(data.slice(start, start + vectorSize));
  }
  return out;
}

function normalizeEmbeddingInput(args: {
  definition: AiBookmarkModelDefinition;
  text: string;
  isQuery: boolean;
}): string {
  const normalizedText = args.text.trim();
  if (!normalizedText) return normalizedText;
  if (!args.isQuery || !args.definition.queryInstruction) return normalizedText;
  return `${args.definition.queryInstruction}${normalizedText}`;
}

async function getFeatureExtractionPipeline(
  modelId: AiBookmarkModelId,
  options?: {
    onProgress?: (progress: AiBookmarkModelLoadProgress) => void;
  },
): Promise<FeatureExtractionPipeline> {
  const source = await getModelAssetSource(modelId);
  const cached = pipelineCache.get(source.cacheKey);
  if (cached) {
    options?.onProgress?.({ progress: 100, label: 'AI 模型已就绪' });
    return cached;
  }

  const assetsReady = await hasModelAssets(modelId);
  if (!assetsReady) {
    throw new Error(`local_model_assets_missing:${modelId}`);
  }

  const definition = AI_BOOKMARK_MODEL_REGISTRY[modelId];
  const next = (async () => {
    await configureTransformersEnvironment();
    return loadFeatureExtractionPipeline(modelId, definition, options);
  })();
  pipelineCache.set(source.cacheKey, next);

  try {
    return await next;
  } catch (error) {
    pipelineCache.delete(source.cacheKey);
    throw error;
  }
}

export async function embedTextsWithBookmarkModel(args: {
  modelId: AiBookmarkModelId;
  texts: string[];
  isQuery?: boolean;
  onProgress?: (progress: AiBookmarkModelLoadProgress) => void;
}): Promise<number[][]> {
  const definition = AI_BOOKMARK_MODEL_REGISTRY[args.modelId];
  const pipeline = await getFeatureExtractionPipeline(args.modelId, {
    onProgress: args.onProgress,
  });
  const normalizedInputs = args.texts.map((text) => normalizeEmbeddingInput({
    definition,
    text,
    isQuery: Boolean(args.isQuery),
  }));
  const tensor = await pipeline(normalizedInputs, {
    pooling: 'mean',
    normalize: true,
  });
  return splitTensorEmbeddings(tensor, normalizedInputs.length);
}

export async function preloadBookmarkModel(args: {
  modelId: AiBookmarkModelId;
  onProgress?: (progress: AiBookmarkModelLoadProgress) => void;
}): Promise<void> {
  await getFeatureExtractionPipeline(args.modelId, {
    onProgress: args.onProgress,
  });
}
