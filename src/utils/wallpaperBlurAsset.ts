type RenderSurface = OffscreenCanvas | HTMLCanvasElement;
type RenderContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

type CachedBlurredWallpaperAsset = {
  objectUrl: string;
  cacheKey: string;
  accessedAt: number;
};

export type BlurredWallpaperDimensions = {
  outputWidth: number;
  outputHeight: number;
  sampleWidth: number;
  sampleHeight: number;
};

export type GenerateBlurredWallpaperAssetParams = {
  src: string;
  viewportWidth: number;
  viewportHeight: number;
};

const BLURRED_WALLPAPER_MAX_OUTPUT_EDGE_PX = 1280;
const BLURRED_WALLPAPER_OUTPUT_MIN_EDGE_PX = 180;
const BLURRED_WALLPAPER_SAMPLE_SCALE = 0.2;
const BLURRED_WALLPAPER_MIN_SAMPLE_EDGE_PX = 128;
const BLURRED_WALLPAPER_MAX_CACHE_ENTRIES = 6;
const BLURRED_WALLPAPER_CACHE_VERSION = 'v4';
const BLURRED_WALLPAPER_FIRST_PASS_FILTER = 'blur(18px) saturate(1.02) brightness(1.01)';
const BLURRED_WALLPAPER_SECOND_PASS_FILTER = 'blur(32px) saturate(1.01) brightness(1)';
const VIDEO_FILE_EXTENSION_PATTERN = /\.(mp4|webm|mov|m4v|ogv)(?:$|[?#])/i;
const VIDEO_FRAME_SEEK_TIME_SECONDS = 0.12;

const blurredWallpaperAssetCache = new Map<string, CachedBlurredWallpaperAsset>();
const blurredWallpaperPendingCache = new Map<string, Promise<CachedBlurredWallpaperAsset | null>>();

function clampToPositiveInt(value: number, fallback: number) {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(1, Math.round(value));
}

function fitWithinMaxEdge(width: number, height: number, maxEdge: number) {
  const longestEdge = Math.max(width, height, 1);
  const scale = Math.min(1, maxEdge / longestEdge);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function resolveBlurredWallpaperDimensions(params: {
  viewportWidth: number;
  viewportHeight: number;
}): BlurredWallpaperDimensions {
  const viewportWidth = clampToPositiveInt(params.viewportWidth, 1280);
  const viewportHeight = clampToPositiveInt(params.viewportHeight, 720);
  const outputFitted = fitWithinMaxEdge(
    viewportWidth,
    viewportHeight,
    BLURRED_WALLPAPER_MAX_OUTPUT_EDGE_PX,
  );
  const outputWidth = Math.max(BLURRED_WALLPAPER_OUTPUT_MIN_EDGE_PX, outputFitted.width);
  const outputHeight = Math.max(BLURRED_WALLPAPER_OUTPUT_MIN_EDGE_PX, outputFitted.height);
  const sampleFitted = fitWithinMaxEdge(
    Math.max(BLURRED_WALLPAPER_MIN_SAMPLE_EDGE_PX, Math.round(outputWidth * BLURRED_WALLPAPER_SAMPLE_SCALE)),
    Math.max(BLURRED_WALLPAPER_MIN_SAMPLE_EDGE_PX, Math.round(outputHeight * BLURRED_WALLPAPER_SAMPLE_SCALE)),
    Math.max(BLURRED_WALLPAPER_MIN_SAMPLE_EDGE_PX, Math.round(BLURRED_WALLPAPER_MAX_OUTPUT_EDGE_PX * BLURRED_WALLPAPER_SAMPLE_SCALE)),
  );

  return {
    outputWidth,
    outputHeight,
    sampleWidth: sampleFitted.width,
    sampleHeight: sampleFitted.height,
  };
}

export function buildBlurredWallpaperCacheKey(params: {
  src: string;
  viewportWidth: number;
  viewportHeight: number;
}) {
  const dimensions = resolveBlurredWallpaperDimensions({
    viewportWidth: params.viewportWidth,
    viewportHeight: params.viewportHeight,
  });
  return [
    BLURRED_WALLPAPER_CACHE_VERSION,
    params.src,
    dimensions.outputWidth,
    dimensions.outputHeight,
  ].join('|');
}

function createRenderSurface(width: number, height: number): RenderSurface {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getRenderContext(surface: RenderSurface): RenderContext {
  const context = surface.getContext('2d', { alpha: false }) as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
  if (!context) {
    throw new Error('wallpaper-blur-context-unavailable');
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  return context;
}

function releaseObjectUrl(url: string) {
  try {
    URL.revokeObjectURL(url);
  } catch {}
}

function pruneBlurredWallpaperAssetCache(preserveKey?: string) {
  while (blurredWallpaperAssetCache.size > BLURRED_WALLPAPER_MAX_CACHE_ENTRIES) {
    const oldestEntry = [...blurredWallpaperAssetCache.entries()]
      .filter(([cacheKey]) => cacheKey !== preserveKey)
      .sort((left, right) => left[1].accessedAt - right[1].accessedAt)[0];
    if (!oldestEntry) {
      return;
    }
    blurredWallpaperAssetCache.delete(oldestEntry[0]);
    releaseObjectUrl(oldestEntry[1].objectUrl);
  }
}

async function loadBitmapFromBlob(blob: Blob, width: number, height: number): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'high',
      });
    } catch {}
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('wallpaper-blur-image-load-failed'));
      element.src = objectUrl;
    });
    return image;
  } finally {
    releaseObjectUrl(objectUrl);
  }
}

function isVideoWallpaperSource(src: string, blob: Blob) {
  return blob.type.startsWith('video/') || VIDEO_FILE_EXTENSION_PATTERN.test(src);
}

async function waitForMediaEvent(
  target: HTMLMediaElement,
  resolveEventName: keyof HTMLMediaElementEventMap,
  rejectEventNames: Array<keyof HTMLMediaElementEventMap>,
) {
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(resolveEventName, handleResolve);
      rejectEventNames.forEach((eventName) => target.removeEventListener(eventName, handleReject));
    };
    const handleResolve = () => {
      cleanup();
      resolve();
    };
    const handleReject = () => {
      cleanup();
      reject(new Error(`wallpaper-blur-media-${String(resolveEventName)}-failed`));
    };

    target.addEventListener(resolveEventName, handleResolve, { once: true });
    rejectEventNames.forEach((eventName) => target.addEventListener(eventName, handleReject, { once: true }));
  });
}

async function loadVideoFrameFromBlob(blob: Blob): Promise<{
  video: HTMLVideoElement;
  release: () => void;
}> {
  if (typeof document === 'undefined') {
    throw new Error('wallpaper-blur-video-document-unavailable');
  }

  const objectUrl = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';

  try {
    video.src = objectUrl;
    video.load();
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitForMediaEvent(video, 'loadeddata', ['error', 'abort']);
    }

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const seekTarget = duration > 0
      ? Math.min(VIDEO_FRAME_SEEK_TIME_SECONDS, Math.max(0, duration * 0.2))
      : 0;

    if (seekTarget > 0 && Math.abs(video.currentTime - seekTarget) > 0.01) {
      video.currentTime = seekTarget;
      await waitForMediaEvent(video, 'seeked', ['error', 'abort']);
    }

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitForMediaEvent(video, 'loadeddata', ['error', 'abort']);
    }

    return {
      video,
      release: () => {
        video.pause();
        video.removeAttribute('src');
        video.load();
        releaseObjectUrl(objectUrl);
      },
    };
  } catch (error) {
    video.removeAttribute('src');
    video.load();
    releaseObjectUrl(objectUrl);
    throw error;
  }
}

async function renderSurfaceToObjectUrl(surface: RenderSurface): Promise<string> {
  if (typeof OffscreenCanvas !== 'undefined' && surface instanceof OffscreenCanvas) {
    const blob = await surface.convertToBlob({ type: 'image/webp', quality: 0.86 });
    return URL.createObjectURL(blob);
  }

  const htmlCanvasSurface = surface as HTMLCanvasElement;
  const blob = await new Promise<Blob>((resolve, reject) => {
    htmlCanvasSurface.toBlob((nextBlob: Blob | null) => {
      if (nextBlob) {
        resolve(nextBlob);
        return;
      }
      reject(new Error('wallpaper-blur-blob-unavailable'));
    }, 'image/webp', 0.86);
  });
  return URL.createObjectURL(blob);
}

async function fetchWallpaperBlob(src: string): Promise<Blob> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`wallpaper-blur-fetch-failed-${response.status}`);
  }
  return response.blob();
}

export async function generateBlurredWallpaperAsset({
  src,
  viewportWidth,
  viewportHeight,
}: GenerateBlurredWallpaperAssetParams): Promise<CachedBlurredWallpaperAsset | null> {
  const normalizedSrc = src.trim();
  if (!normalizedSrc) return null;

  const cacheKey = buildBlurredWallpaperCacheKey({
    src: normalizedSrc,
    viewportWidth,
    viewportHeight,
  });
  const cachedAsset = blurredWallpaperAssetCache.get(cacheKey);
  if (cachedAsset) {
    cachedAsset.accessedAt = Date.now();
    return cachedAsset;
  }

  const pendingAsset = blurredWallpaperPendingCache.get(cacheKey);
  if (pendingAsset) {
    return pendingAsset;
  }

  const generationTask = (async () => {
    let videoFrame: Awaited<ReturnType<typeof loadVideoFrameFromBlob>> | null = null;
    let bitmap: ImageBitmap | HTMLImageElement | HTMLVideoElement | null = null;
    try {
      const { outputWidth, outputHeight, sampleWidth, sampleHeight } = resolveBlurredWallpaperDimensions({
        viewportWidth,
        viewportHeight,
      });
      const blob = await fetchWallpaperBlob(normalizedSrc);
      videoFrame = isVideoWallpaperSource(normalizedSrc, blob)
        ? await loadVideoFrameFromBlob(blob)
        : null;
      bitmap = videoFrame
        ? videoFrame.video
        : await loadBitmapFromBlob(blob, sampleWidth, sampleHeight);

      const sampleSurface = createRenderSurface(sampleWidth, sampleHeight);
      const sampleContext = getRenderContext(sampleSurface);
      sampleContext.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight);

      const upscaleSurface = createRenderSurface(outputWidth, outputHeight);
      const upscaleContext = getRenderContext(upscaleSurface);
      upscaleContext.drawImage(sampleSurface as CanvasImageSource, 0, 0, outputWidth, outputHeight);

      const firstPassSurface = createRenderSurface(outputWidth, outputHeight);
      const firstPassContext = getRenderContext(firstPassSurface);
      if ('filter' in firstPassContext) {
        firstPassContext.filter = BLURRED_WALLPAPER_FIRST_PASS_FILTER;
      }
      firstPassContext.drawImage(upscaleSurface as CanvasImageSource, 0, 0, outputWidth, outputHeight);
      if ('filter' in firstPassContext) {
        firstPassContext.filter = 'none';
      }

      const softenedSurface = createRenderSurface(outputWidth, outputHeight);
      const softenedContext = getRenderContext(softenedSurface);
      if ('filter' in softenedContext) {
        softenedContext.filter = BLURRED_WALLPAPER_SECOND_PASS_FILTER;
      }
      softenedContext.drawImage(firstPassSurface as CanvasImageSource, 0, 0, outputWidth, outputHeight);
      if ('filter' in softenedContext) {
        softenedContext.filter = 'none';
      }
      softenedContext.globalAlpha = 0.025;
      softenedContext.drawImage(upscaleSurface as CanvasImageSource, 0, 0, outputWidth, outputHeight);
      softenedContext.globalAlpha = 1;

      const objectUrl = await renderSurfaceToObjectUrl(softenedSurface);
      const nextAsset: CachedBlurredWallpaperAsset = {
        objectUrl,
        cacheKey,
        accessedAt: Date.now(),
      };
      blurredWallpaperAssetCache.set(cacheKey, nextAsset);
      pruneBlurredWallpaperAssetCache(cacheKey);

      return nextAsset;
    } catch {
      return null;
    } finally {
      if (typeof ImageBitmap !== 'undefined' && bitmap instanceof ImageBitmap) {
        bitmap.close();
      }
      videoFrame?.release();
      blurredWallpaperPendingCache.delete(cacheKey);
    }
  })();

  blurredWallpaperPendingCache.set(cacheKey, generationTask);
  return generationTask;
}
