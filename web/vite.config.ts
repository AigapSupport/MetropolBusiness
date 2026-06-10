import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Firma admin paneli — Vite yapılandırması.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Ortak DTO tipleri tek kaynaktan gelir (docs/CLAUDE.md §7).
      '@shared': path.resolve(__dirname, '../shared/types/src'),
    },
  },
});
