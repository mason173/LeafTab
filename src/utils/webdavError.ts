type WebdavOperation = 'upload' | 'download';

const WEBDAV_STATUS_PATTERN = /WebDAV (?:upload|download) failed:\s*(\d{3})/i;

export class WebdavHttpError extends Error {
  status: number;
  operation: WebdavOperation;

  constructor(operation: WebdavOperation, status: number) {
    super(`WebDAV ${operation} failed: ${status}`);
    this.name = 'WebdavHttpError';
    this.status = status;
    this.operation = operation;
  }
}

export const getWebdavHttpStatus = (error: unknown): number | null => {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status?: unknown }).status);
    if (Number.isInteger(status) && status > 0) return status;
  }
  const message = String((error as { message?: unknown })?.message || '');
  const match = message.match(WEBDAV_STATUS_PATTERN);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const isWebdavAuthError = (error: unknown): boolean => {
  const status = getWebdavHttpStatus(error);
  return status === 401 || status === 403;
};
