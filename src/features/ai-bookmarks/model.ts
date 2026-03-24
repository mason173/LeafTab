import {
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

let transformersImportPromise: Promise<typeof import('@huggingface/transformers')> | null = null;
const pipelineCache = new Map<string, Promise<FeatureExtractionPipeline>>();
const modelAvailabilityCache = new Map<string, Promise<boolean>>();
const modelSourceCache = new Map<string, Promise<ModelAssetSource>>();

function getTransformersModule() {
  if (!transformersImportPromise) {
    transformersImportPromise = import('@huggingface/transformers');
  }
  return transformersImportPromise;
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

  const candidates: ModelAssetSource[] = [
    {
      baseUrl: resolveRuntimeAssetUrl(definition.modelPath).replace(/\/+$/, ''),
      cacheKey: `${modelId}::local`,
      localFilesOnly: true,
    },
  ];

  if (definition.remoteModelBaseUrl) {
    candidates.push({
      baseUrl: definition.remoteModelBaseUrl.replace(/\/+$/, ''),
      cacheKey: `${modelId}::remote::${definition.remoteModelBaseUrl.replace(/\/+$/, '')}`,
      localFilesOnly: false,
    });
  }

  return candidates;
}

function resolveModelAssetUrl(source: ModelAssetSource, relativePath: string): string {
  return new URL(relativePath.replace(/^\/+/, ''), `${source.baseUrl}/`).toString();
}

async function configureTransformersEnvironment() {
  const { env } = await getTransformersModule();
  env.allowLocalModels = true;
  env.allowRemoteModels = true;
  env.useBrowserCache = false;
  env.backends.onnx.wasm.proxy = false;
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.wasmPaths = {
    mjs: resolveRuntimeAssetUrl('ort/ort-wasm-simd-threaded.mjs'),
    wasm: resolveRuntimeAssetUrl('ort/ort-wasm-simd-threaded.wasm'),
  };
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

async function hasModelAssets(modelId: AiBookmarkModelId): Promise<boolean> {
  const source = await getModelAssetSource(modelId);
  const cached = modelAvailabilityCache.get(source.cacheKey);
  if (cached) return cached;

  const next = (async () => {
    const checks = await Promise.all([
      fileExists(resolveModelAssetUrl(source, 'config.json')),
      fileExists(resolveModelAssetUrl(source, 'tokenizer.json')),
      fileExists(resolveModelAssetUrl(source, 'onnx/model_quantized.onnx')),
      fileExists(resolveModelAssetUrl(source, 'special_tokens_map.json')),
      fileExists(resolveRuntimeAssetUrl('ort/ort-wasm-simd-threaded.mjs')),
      fileExists(resolveRuntimeAssetUrl('ort/ort-wasm-simd-threaded.wasm')),
      fileExists(resolveRuntimeAssetUrl('ort/ort-wasm-simd-threaded.jsep.mjs')),
      fileExists(resolveRuntimeAssetUrl('ort/ort-wasm-simd-threaded.jsep.wasm')),
    ]);
    return checks.every(Boolean);
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
      const checks = await Promise.all([
        fileExists(resolveModelAssetUrl(source, 'config.json')),
        fileExists(resolveModelAssetUrl(source, 'tokenizer.json')),
        fileExists(resolveModelAssetUrl(source, `onnx/${definition.modelFileName}`)),
        fileExists(resolveModelAssetUrl(source, 'special_tokens_map.json')),
      ]);
      if (checks.every(Boolean)) {
        return source;
      }
    }
    throw new Error(`local_model_assets_missing:${modelId}`);
  })().catch((error) => {
    modelSourceCache.delete(cacheKey);
    throw error;
  });

  modelSourceCache.set(cacheKey, next);
  return next;
}

async function loadFeatureExtractionPipeline(
  modelId: AiBookmarkModelId,
  definition: AiBookmarkModelDefinition,
): Promise<FeatureExtractionPipeline> {
  const { pipeline } = await getTransformersModule();
  const source = await getModelAssetSource(modelId);
  const modelUrl = source.baseUrl;
  const modelBaseName = definition.modelFileName
    .replace(/_quantized\.onnx$/i, '')
    .replace(/\.onnx$/i, '');
  return pipeline('feature-extraction', modelUrl, {
    local_files_only: source.localFilesOnly,
    subfolder: 'onnx',
    model_file_name: modelBaseName,
    dtype: 'q8',
    device: 'wasm',
  }) as Promise<FeatureExtractionPipeline>;
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
): Promise<FeatureExtractionPipeline> {
  const source = await getModelAssetSource(modelId);
  const cached = pipelineCache.get(source.cacheKey);
  if (cached) return cached;

  const assetsReady = await hasModelAssets(modelId);
  if (!assetsReady) {
    throw new Error(`local_model_assets_missing:${modelId}`);
  }

  const definition = AI_BOOKMARK_MODEL_REGISTRY[modelId];
  const next = (async () => {
    await configureTransformersEnvironment();
    return loadFeatureExtractionPipeline(modelId, definition);
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
}): Promise<number[][]> {
  const definition = AI_BOOKMARK_MODEL_REGISTRY[args.modelId];
  const pipeline = await getFeatureExtractionPipeline(args.modelId);
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
