/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // @inshapardaz/likhari-react's package.json exports a "development" condition pointing at its
    // unpublished TypeScript source (only "dist" ships to npm). Vite's dev server picks that
    // condition by default and fails to resolve it, so pin resolution to the published "import"
    // build instead (as library-editor does).
    conditions: ['import', 'module', 'browser', 'default'],
  },
  // The app talks to the API directly (see src/config.ts); 4500 is the port development/
  // docker-compose.yml publishes it on, so local and compose runs share one CORS origin.
  server: {
    port: 4500,
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', 'tests/**'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Lexical (pulled in by likhari-react) — must come before React check
            if (id.includes('@lexical/') || id.includes('/lexical/')) {
              return 'vendor-lexical';
            }
            if (id.includes('/react-dom/') || (id.includes('/react/') && !id.includes('@lexical'))) {
              return 'vendor-react';
            }
            if (id.includes('@mantine/')) {
              return 'vendor-mantine';
            }
            if (id.includes('@tabler/icons-react')) {
              return 'vendor-icons';
            }
          }
        },
      },
    },
  },
});
