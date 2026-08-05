import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../wwwroot',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Lexical (including @lexical/react) — must come before React check
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
