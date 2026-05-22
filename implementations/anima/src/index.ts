import { startServer } from './api/server.js';
import { startWorkers } from './workers/index.js';
import { recoverCrashedSessions } from './harness/crash-recovery.js';

const COMPANY_NAME = process.env['ANIMA_COMPANY'] ?? 'default';

async function boot(): Promise<void> {
  // 1. Start Fastify API (connects MongoDB internally)
  await startServer();

  // 2. Recover any sessions that crashed before this boot
  await recoverCrashedSessions();

  // 3. Start BullMQ workers + Quality Agent repeatable job
  await startWorkers(COMPANY_NAME);

  console.log('[platform] Anima platform ready.');
}

boot().catch((err) => {
  console.error('Failed to start platform:', err);
  process.exit(1);
});
