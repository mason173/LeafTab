import { AI_BOOKMARK_MODEL_REGISTRY } from '@/features/ai-bookmarks/constants';
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

let transformersImportPromise: Promise<typeof import('@huggingface/transformers')> | null = null;
const pipelineCache = new Map<AiBookmarkModelId, Promise<FeatureExtractionPipeline>>();
const modelAvailabilityCache = new Map<AiBookmarkModelId, Promise<boolean>>();

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

async function configureTransformersEnvironment() {
  const { env } = await getTransformersModule();
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.useBrowserCache = false;
  env.backends.onnx.wasm.proxy = false;
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.wasmPaths = {
    mjs: resolveRuntimeAssetUrl('ort/ort-wasm-simd-threaded.mjs'),
    wasm: resolveRuntimeAssetUrl('ort/ort-wasm-simd-threaded.wasm'),
  };
}

async function fileExists(relativePath: string): Promise<boolean> {
  try {
    const response = await fetch(resolveRuntimeAssetUrl(relativePath), {
      method: 'GET',
      cache: 'no-cache',
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function hasLocalModelAssets(modelId: AiBookmarkModelId): Promise<boolean> {
  const cached = modelAvailabilityCache.get(modelId);
  if (cached) return cached;

  const definition = AI_BOOKMARK_MODEL_REGISTRY[modelId];
  const next = (async () => {
    const checks = await Promise.all([
      fileExists(`${definition.modelPath}/config.json`),
      fileExists(`${definition.modelPath}/tokenizer.json`),
      fileExists(`${definition.modelPath}/onnx/${definition.modelFileName}`),
      fileExists('ort/ort-wasm-simd-threaded.mjs'),
      fileExists('ort/ort-wasm-simd-threaded.wasm'),
      fileExists('ort/ort-wasm-simd-threaded.jsep.mjs'),
      fileExists('ort/ort-wasm-simd-threaded.jsep.wasm'),
    ]);
    return checks.every(Boolean);
  })();
  modelAvailabilityCache.set(modelId, next);

  try {
    return await next;
  } catch (error) {
    modelAvailabilityCache.delete(modelId);
    throw error;
  }
}

async function loadFeatureExtractionPipeline(
  definition: AiBookmarkModelDefinition,
): Promise<FeatureExtractionPipeline> {
  const { pipeline } = await getTransformersModule();
  const modelUrl = resolveRuntimeAssetUrl(definition.modelPath);
  const modelBaseName = definition.modelFileName
    .replace(/_quantized\.onnx$/i, '')
    .replace(/\.onnx$/i, '');
  return pipeline('feature-extraction', modelUrl, {
    local_files_only: true,
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
  const cached = pipelineCache.get(modelId);
  if (cached) return cached;

  const localAssetsReady = await hasLocalModelAssets(modelId);
  if (!localAssetsReady) {
    throw new Error(`local_model_assets_missing:${modelId}`);
  }

  const definition = AI_BOOKMARK_MODEL_REGISTRY[modelId];
  const next = (async () => {
    await configureTransformersEnvironment();
    return loadFeatureExtractionPipeline(definition);
  })();
  pipelineCache.set(modelId, next);

  try {
    return await next;
  } catch (error) {
    pipelineCache.delete(modelId);
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
