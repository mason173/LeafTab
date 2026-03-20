import {
  getExtensionManifest,
  getExtensionRuntime,
  getPermissionsApi,
  isExtensionRuntime,
} from '@/platform/runtime';

type OriginPermissionSet = {
  required: string[];
  optional: string[];
};

export type ExtensionPermissionSupport = 'granted' | 'requestable' | 'unsupported';

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);
const ORIGIN_WILDCARD_PATTERNS = new Set(['<all_urls>', '*://*/*']);

function readManifestStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getDeclaredExtensionPermissions(): { required: string[]; optional: string[] } {
  const manifest = getExtensionManifest() as {
    permissions?: unknown;
    optional_permissions?: unknown;
  } | undefined;

  return {
    required: readManifestStringArray(manifest?.permissions),
    optional: readManifestStringArray(manifest?.optional_permissions),
  };
}

function getDeclaredOriginPermissions(): OriginPermissionSet {
  const manifest = getExtensionManifest() as {
    host_permissions?: unknown;
    optional_host_permissions?: unknown;
  } | undefined;

  return {
    required: readManifestStringArray(manifest?.host_permissions),
    optional: readManifestStringArray(manifest?.optional_host_permissions),
  };
}

export function resolveOriginPattern(targetUrl: string): string | null {
  try {
    const parsed = new URL(targetUrl);
    if (!HTTP_PROTOCOLS.has(parsed.protocol)) return null;
    return `${parsed.origin}/*`;
  } catch {
    return null;
  }
}

function manifestOriginPatternsContain(patterns: readonly string[], targetUrl: string): boolean {
  const originPattern = resolveOriginPattern(targetUrl);
  if (!originPattern) return true;
  if (patterns.includes(originPattern)) return true;
  if (patterns.some((pattern) => ORIGIN_WILDCARD_PATTERNS.has(pattern))) return true;

  try {
    const parsed = new URL(targetUrl);
    return patterns.includes(`${parsed.protocol}//*/*`);
  } catch {
    return false;
  }
}

function callPermissionsContains(query: chrome.permissions.Permissions): Promise<boolean> {
  const permissionsApi = getPermissionsApi();
  const runtime = getExtensionRuntime();
  if (!permissionsApi?.contains) return Promise.resolve(false);

  return new Promise((resolve, reject) => {
    permissionsApi.contains(query, (granted: boolean) => {
      const lastError = runtime?.lastError;
      if (lastError) {
        reject(new Error(lastError.message || 'Permission check failed'));
        return;
      }
      resolve(Boolean(granted));
    });
  });
}

function callPermissionsRequest(query: chrome.permissions.Permissions): Promise<boolean> {
  const permissionsApi = getPermissionsApi();
  const runtime = getExtensionRuntime();
  if (!permissionsApi?.request) return Promise.resolve(false);

  return new Promise((resolve, reject) => {
    permissionsApi.request(query, (granted: boolean) => {
      const lastError = runtime?.lastError;
      if (lastError) {
        reject(new Error(lastError.message || 'Permission request failed'));
        return;
      }
      resolve(Boolean(granted));
    });
  });
}

export async function containsExtensionPermission(permission: string): Promise<boolean> {
  if (!isExtensionRuntime()) return true;

  const declared = getDeclaredExtensionPermissions();
  if (declared.required.includes(permission)) return true;
  if (!declared.optional.includes(permission)) return false;

  try {
    return await callPermissionsContains({ permissions: [permission] });
  } catch {
    return false;
  }
}

export function getExtensionPermissionSupport(permission: string): ExtensionPermissionSupport {
  if (!isExtensionRuntime()) return 'granted';

  const declared = getDeclaredExtensionPermissions();
  if (declared.required.includes(permission)) return 'granted';
  if (!declared.optional.includes(permission)) return 'unsupported';
  return getPermissionsApi()?.request ? 'requestable' : 'unsupported';
}

export async function requestExtensionPermission(permission: string): Promise<boolean> {
  if (!isExtensionRuntime()) return true;

  const declared = getDeclaredExtensionPermissions();
  if (declared.required.includes(permission)) return true;
  if (!declared.optional.includes(permission)) return false;

  try {
    return await callPermissionsRequest({ permissions: [permission] });
  } catch {
    return false;
  }
}

export async function containsOriginPermission(targetUrl: string): Promise<boolean> {
  if (!isExtensionRuntime()) return true;

  const originPattern = resolveOriginPattern(targetUrl);
  if (!originPattern) return true;

  const declared = getDeclaredOriginPermissions();
  if (manifestOriginPatternsContain(declared.required, targetUrl)) return true;
  if (!manifestOriginPatternsContain(declared.optional, targetUrl)) return false;

  try {
    return await callPermissionsContains({ origins: [originPattern] });
  } catch {
    return false;
  }
}

export async function requestOriginPermission(targetUrl: string): Promise<boolean> {
  if (!isExtensionRuntime()) return true;

  const originPattern = resolveOriginPattern(targetUrl);
  if (!originPattern) return true;

  const declared = getDeclaredOriginPermissions();
  if (manifestOriginPatternsContain(declared.required, targetUrl)) return true;
  if (!manifestOriginPatternsContain(declared.optional, targetUrl)) return false;

  try {
    return await callPermissionsRequest({ origins: [originPattern] });
  } catch {
    return false;
  }
}
