import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Any tooling in development; one self-contained dist/index.html in the output.
export default defineConfig({
  plugins: [preact(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Everything is inlined, so there is nothing to split or hash.
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: false,
    reportCompressedSize: false,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
