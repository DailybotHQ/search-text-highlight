import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import searchTextHL from '../src/index'

// search-text-highlight has a single public surface: the default `searchTextHL`
// object with a `highlight` method, exposed for BOTH `import` and `require`. Vite's
// library `commonjs` output assigns the default to `module.exports.default`, so
// src/index.ts ends with `module.exports = searchTextHL` to keep
// `require('search-text-highlight').highlight(...)` working. These tests guard that
// dual-export contract two ways: a static source check (always runs, no build
// needed) and a built-bundle smoke test (runs only when dist/ is fresh).

const repoRoot = process.cwd()
const sourcePath = resolve(repoRoot, 'src/index.ts')
const distPath = resolve(repoRoot, 'dist/index.js')

function newestMtimeUnder(dir: string): number {
  let newest = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtimeUnder(full))
    } else if (entry.isFile()) {
      newest = Math.max(newest, statSync(full).mtimeMs)
    }
  }
  return newest
}

// The built-bundle suite needs an up-to-date dist/index.js. Compute staleness up
// front and skip the suite (with a hint) when dist/ is missing or older than src/,
// so `pnpm test` / `test:watch` never fail spuriously before a build.
function bundleSkipReason(): string | null {
  if (!existsSync(distPath)) return 'dist/index.js not built — run `pnpm run build`'
  if (statSync(distPath).mtimeMs < newestMtimeUnder(resolve(repoRoot, 'src'))) {
    return 'dist/index.js is older than src/ — run `pnpm run build`'
  }
  return null
}

const skipReason = bundleSkipReason()
if (skipReason) {
  console.log(`       (skipping bundle suite: ${skipReason})`)
}

describe('Public exports surface', () => {
  describe('Source (src/index.ts)', () => {
    it('exposes highlight() on the default export', () => {
      expect(searchTextHL).toBeTypeOf('object')
      expect(searchTextHL.highlight).toBeTypeOf('function')
    })

    // Vite's library `commonjs` output assigns `module.exports = <default>.default`,
    // which would break `require('search-text-highlight').highlight(...)`. The
    // `module.exports = searchTextHL` tail in src/index.ts reattaches the object so
    // CJS consumers get the same shape as ESM consumers. Enforce it statically so the
    // rule holds even when CI runs tests without a dist/ build.
    it('reattaches the default export onto module.exports (static check)', () => {
      const source = readFileSync(sourcePath, 'utf8')
      expect(source, 'src/index.ts must keep `export default searchTextHL`').toMatch(
        /^\s*export\s+default\s+searchTextHL\s*$/m
      )
      expect(source, 'src/index.ts must keep `module.exports = searchTextHL` for require() consumers').toMatch(
        /^\s*module\.exports\s*=\s*searchTextHL\s*$/m
      )
    })
  })

  describe.skipIf(Boolean(skipReason))('Built bundle (dist/index.js)', () => {
    const require = createRequire(import.meta.url)

    it('require() returns an object whose highlight() is a function', () => {
      const built = require(distPath)
      expect(built).toBeTypeOf('object')
      expect(built.highlight).toBeTypeOf('function')
    })

    it('require() output matches the frozen HTML contract', () => {
      const built = require(distPath)
      expect(built.highlight('hello world', 'world')).toBe('hello <span class="text-highlight">world</span>')
    })
  })
})
