import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// The desktop shell is the entry-point bundle that Chromium launches in
// kiosk mode. Each app is bundled in with it - so on the Pi we only need a
// single static bundle served by a tiny HTTP server (or file:// URL).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4317,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4319,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@ace/shared': fileURLToPath(new URL('../shared/src', import.meta.url)),
      '@ace/app-home': fileURLToPath(new URL('../apps/home/src', import.meta.url)),
      '@ace/app-planner': fileURLToPath(new URL('../apps/planner/src', import.meta.url)),
      '@ace/app-tasks': fileURLToPath(new URL('../apps/tasks/src', import.meta.url)),
      '@ace/app-focus': fileURLToPath(new URL('../apps/focus/src', import.meta.url)),
      '@ace/app-subjects': fileURLToPath(new URL('../apps/subjects/src', import.meta.url)),
      '@ace/app-ai': fileURLToPath(new URL('../apps/ai/src', import.meta.url)),
      '@ace/app-statistics': fileURLToPath(new URL('../apps/statistics/src', import.meta.url)),
      '@ace/app-settings': fileURLToPath(new URL('../apps/settings/src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
  },
});
