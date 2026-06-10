import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Library build for search-text-highlight.
//
// (vite.config.ts — see vitest.config.ts for the test runner setup.)
//
// Output contract (must match what consumers have always received):
//   - dist/index.js          single minified CommonJS bundle (libraryTarget commonjs2
//                            equivalent). The package ships with ZERO runtime deps.
//   - dist/index.d.ts +      emitted separately by `tsc -p tsconfig.build.json
//     dist/lib/*.d.ts        --emitDeclarationOnly` (see the `build` script).
//
// The package stays CommonJS (no `"type":"module"` in package.json) so dist/index.js
// resolves as CJS and the `module.exports = searchTextHL` tail in src/index.ts keeps
// `require('search-text-highlight').highlight(...)` working for CJS consumers.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild',
    sourcemap: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    // No `rollupOptions.external`: inline everything so the published package has no
    // runtime dependencies.
    rollupOptions: {
      // The `module.exports = searchTextHL` tail in src/index.ts is the intentional
      // CommonJS-interop pattern that lets `require('search-text-highlight').highlight(...)`
      // work for CJS consumers. Rollup flags this with two cosmetic warnings — silence
      // them so they don't drown CI output. The runtime behavior is covered by the test
      // suite (dual-export smoke test).
      onwarn(warning, defaultHandler) {
        if (warning.code === 'COMMONJS_VARIABLE_IN_ESM') return
        if (warning.code === 'MIXED_EXPORTS') return
        defaultHandler(warning)
      },
    },
  },
})
