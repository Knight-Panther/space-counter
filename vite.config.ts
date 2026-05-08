import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  server: {
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/phaser')) return 'phaser';
        },
      },
    },
  },
});
