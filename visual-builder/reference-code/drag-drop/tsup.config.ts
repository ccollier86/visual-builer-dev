import { defineConfig } from 'tsup';

export default defineConfig({
  // Entry points
  entry: {
    index: './index.ts',
    react: './adapters/react/index.ts'
  },

  // Output formats
  format: ['cjs', 'esm'],

  // Generate TypeScript declarations
  dts: true,

  // Source maps for debugging
  sourcemap: true,

  // Clean dist before build
  clean: true,

  // External dependencies (not bundled)
  external: [
    'react',
    'react-dom',
    '@xstate/store',
    'gsap'
  ],

  // Minify for production
  minify: true,

  // Tree shaking
  treeshake: true,

  // Split chunks for better caching
  splitting: true,

  // Target modern browsers
  target: 'es2020',

  // Preserve JSX for React
  jsx: 'preserve',

  // Bundle info
  metafile: true,

  // onSuccess callback for logging
  onSuccess: 'echo "✅ Build complete!"'
});
