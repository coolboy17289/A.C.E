import { createServer } from 'node:http';
import { createApp } from './server.js';
import { openDatabase, closeDatabase } from './db.js';
import { seedIfEmpty } from './seed.js';
import { startDeviceMonitor } from './services/hardware.js';

// NB: 4317 is reserved for the Vite dev server (frontend/desktop-shell).
// The backend listens on 4318 by default so the two can run side by side
// via `npm run dev` (which runs both in parallel via npm-run-all).
// In production the backend serves the React shell too, so the vite dev
// server isn't running and 4317 is free for it - set ACE_PORT=4317 then.
const PORT = Number(process.env.ACE_PORT ?? 4318);
const DB_PATH = process.env.ACE_DB_PATH ?? './data/ace.db';
const AUTO_INSTALL_OLLAMA = process.env.ACE_AUTO_INSTALL_OLLAMA === '1';

async function main() {
  const db = openDatabase(DB_PATH);
  await seedIfEmpty(db);

  const app = createApp({ db });
  const server = createServer(app);

  // Background poller that refreshes DeviceInfo on the bus every 5s. The
  // /api/hardware/device route reads from the in-memory snapshot, so the
  // frontend never blocks while we read /sys or /proc.
  startDeviceMonitor(db, 5_000);

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[ace-backend] listening on http://0.0.0.0:${PORT}`);
  });

  // Optional: kick off Ollama install in the background when the user
  // has opted in via ACE_AUTO_INSTALL_OLLAMA=1. We never block boot; the
  // AI Tutor's /api/ai/status endpoint reflects progress and the
  // frontend's "Set up Ollama" CTA will see `installing` flip true.
  //
  // Dynamic import keeps the cost of finding a missing script to one
  // extra microtask, and avoids a synchronous boot stall while the
  // curl-into-Docker install runs.
  if (AUTO_INSTALL_OLLAMA) {
    const { runInstall } = await import('./services/ai.js');
    void runInstall().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[ace-backend] background Ollama install failed', err);
    });
  }

  const shutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[ace-backend] ${signal} received, draining...`);
    server.close(() => {
      closeDatabase(db);
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[ace-backend] fatal startup error', err);
  process.exit(1);
});
