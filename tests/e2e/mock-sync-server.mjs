import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMockSyncService } from '../support/mockSyncService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const staticDir = path.join(repoRoot, 'build');

const service = await startMockSyncService({
  host: '127.0.0.1',
  port: 4173,
  staticDir,
});

console.log(`[mock-sync-server] listening on ${service.url}`);

const shutdown = async () => {
  await service.close().catch(() => {});
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.stdin.resume();
