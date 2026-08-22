import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: {
    fs: {
      // shared/ liegt ausserhalb von app/ (siehe design_handoff_kirchen_app/README.md
      // Abschnitt 13, Schritt 5: eine Implementierung der Berechnungslogik für
      // App und Import-Skript).
      allow: ['..'],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
