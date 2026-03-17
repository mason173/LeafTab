type EnsureOriginPermissionOptions = {
  requestIfNeeded?: boolean;
};

type EnsureExtensionPermissionOptions = {
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

export async function ensureExtensionPermission(
  permission: string,
  options?: EnsureExtensionPermissionOptions,
): Promise<boolean> {
  const requestIfNeeded = options?.requestIfNeeded !== false;
  const chromeApi = (globalThis as any)?.chrome;
  const runtime = chromeApi?.runtime;
  const permissionsApi = chromeApi?.permissions;

  // Non-extension runtime (e.g. dev web) skips permission checks.
  if (!runtime?.id || !permissionsApi?.contains) return true;

  const manifest = runtime.getManifest?.();
  const declaredPermissions = Array.isArray(manifest?.permissions) ? manifest.permissions : [];
  const declaredOptionalPermissions = Array.isArray(manifest?.optional_permissions) ? manifest.optional_permissions : [];
  if (!declaredPermissions.includes("permissions")) return true;
  if (!declaredPermissions.includes(permission) && !declaredOptionalPermissions.includes(permission)) {
    return false;
  }

  // IMPORTANT: request() should be called directly in user-gesture flows.
  if (requestIfNeeded && permissionsApi?.request) {
    const grantedByRequest = await new Promise<boolean>((resolve, reject) => {
      permissionsApi.request({ permissions: [permission] }, (allowed: boolean) => {
        const lastError = runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message || "Permission request failed"));
          return;
        }
        resolve(Boolean(allowed));
      });
    });
    return grantedByRequest;
  }

  const hasPermission = await new Promise<boolean>((resolve, reject) => {
    permissionsApi.contains({ permissions: [permission] }, (granted: boolean) => {
      const lastError = runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message || "Permission check failed"));
        return;
      }
      resolve(Boolean(granted));
    });
  });

  return hasPermission;
}
