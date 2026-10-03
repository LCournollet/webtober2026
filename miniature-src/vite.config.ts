import { defineConfig } from 'vite';

// le build part directement dans le dossier déployé du jour 3 (../miniature)
export default defineConfig({
  base: './',
  build: {
    outDir: '../miniature',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
  },
});
