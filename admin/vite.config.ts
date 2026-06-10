import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// @shared alias'ı tsconfig "paths" ile birebir aynı klasörü gösterir (shared/types/src).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared/types/src', import.meta.url)),
    },
  },
});
