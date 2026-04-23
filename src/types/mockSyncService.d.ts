declare module '../../../tests/support/mockSyncService.mjs' {
  export type MockSyncServiceSeed = unknown;

  export type MockSyncService = {
    host: string;
    port: number;
    url: string;
    resetState(seed?: MockSyncServiceSeed): void;
    getState(): unknown;
    close(): Promise<void>;
  };

  export function startMockSyncService(options?: {
    host?: string;
    port?: number;
    staticDir?: string | null;
  }): Promise<MockSyncService>;
}
