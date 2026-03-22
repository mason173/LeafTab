import {
  containsExtensionPermission,
  containsOriginPermission,
  requestExtensionPermission,
  requestOriginPermission,
} from '@/platform/permissions';

type EnsureOriginPermissionOptions = {
  requestIfNeeded?: boolean;
};

type EnsureExtensionPermissionOptions = {
  requestIfNeeded?: boolean;
};

export async function ensureOriginPermission(
  targetUrl: string,
  options?: EnsureOriginPermissionOptions,
): Promise<boolean> {
  const requestIfNeeded = options?.requestIfNeeded !== false;
  const hasPermission = await containsOriginPermission(targetUrl);
  if (hasPermission) return true;
  if (!requestIfNeeded) return false;
  return requestOriginPermission(targetUrl);
}

export async function ensureExtensionPermission(
  permission: string,
  options?: EnsureExtensionPermissionOptions,
): Promise<boolean> {
  const requestIfNeeded = options?.requestIfNeeded !== false;
  if (requestIfNeeded) {
    return requestExtensionPermission(permission);
  }
  return containsExtensionPermission(permission);
}
