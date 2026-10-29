import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Saat pengembangan, /api diteruskan ke API server (npm run server).
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  preview: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  test: {
    include: ['tests/**/*.test.ts'],
  },
} as never);
