import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  if (mode === 'production') {
    return {
      root: 'train-game',
      base: '',
      publicDir: false,
      esbuild: { target: 'es2015' },
      build: {
        outDir: '../train-dist',
        emptyOutDir: true,
        target: 'es2015',
        cssCodeSplit: false,
        rollupOptions: {
          input: 'train-game/index.html',
          output: {
            format: 'iife',
            name: 'TrainGame',
            entryFileNames: 'assets/train-game.js',
            inlineDynamicImports: true,
          },
        },
      },
    };
  }

  return {
    root: '.',
    publicDir: 'public',
    server: { port: 3000, open: false },
    build: { outDir: 'dist', emptyOutDir: true },
  };
});