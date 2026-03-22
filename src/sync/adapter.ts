export type SyncPushMode = 'strict' | 'prefer_local' | 'prefer_remote';

export type SyncPullResult<TPayload, TVersion = number | null, TMeta = Record<string, unknown>> = {
  payload: TPayload | null;
  version: TVersion;
  status: number;
  updatedAt?: string | null;
  meta?: TMeta;
};

export type SyncPushResult<TVersion = number | null> = {
  ok: boolean;
  status: number;
  version: TVersion;
  contentType?: string | null;
};

export type SyncAdapter<TPayload, TVersion = number | null, TMeta = Record<string, unknown>> = {
  pull: () => Promise<SyncPullResult<TPayload, TVersion, TMeta>>;
  push: (payload: TPayload, options?: { expectedVersion?: TVersion; mode?: SyncPushMode }) => Promise<SyncPushResult<TVersion>>;
};
