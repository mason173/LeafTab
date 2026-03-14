type EnsureOriginPermissionOptions = {
  requestIfNeeded?: boolean;
};

const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

const resolveOriginPattern = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (!HTTP_PROTOCOLS.has(parsed.protocol)) return null;
    return `${parsed.origin}/*`;
  } catch {
    return null;
  }
};

export async function ensureOriginPermission(
  targetUrl: string,
  options?: EnsureOriginPermissionOptions,
): Promise<boolean> {
  const requestIfNeeded = options?.requestIfNeeded !== false;
  const chromeApi = (globalThis as any)?.chrome;
  const runtime = chromeApi?.runtime;
  const permissionsApi = chromeApi?.permissions;

  // Non-extension runtime (e.g. dev web) skips permission checks.
  if (!runtime?.id || !permissionsApi?.contains) return true;

  const manifest = runtime.getManifest?.();
  const declaredPermissions = Array.isArray(manifest?.permissions) ? manifest.permissions : [];
  if (!declaredPermissions.includes("permissions")) return true;

  const originPattern = resolveOriginPattern(targetUrl);
  if (!originPattern) return true;

  const hasPermission = await new Promise<boolean>((resolve, reject) => {
    permissionsApi.contains({ origins: [originPattern] }, (granted: boolean) => {
      const lastError = runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message || "Permission check failed"));
        return;
      }
      resolve(Boolean(granted));
    });
  });

  if (hasPermission) return true;
  if (!requestIfNeeded || !permissionsApi?.request) return false;

  const granted = await new Promise<boolean>((resolve, reject) => {
    permissionsApi.request({ origins: [originPattern] }, (allowed: boolean) => {
      const lastError = runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message || "Permission request failed"));
        return;
      }
      resolve(Boolean(allowed));
    });
  });

  return granted;
}

