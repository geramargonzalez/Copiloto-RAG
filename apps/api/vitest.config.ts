import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@copiloto/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@copiloto/shared/*': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup-env.ts'],
  },
});
