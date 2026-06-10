import type { OptionsType, SearchTextHLType } from './lib/type'
import Utils from './lib/utils'

/**
 * Allow find a string or substring from a text and
 * highlight it with html wrapper and unicode support.
 * @return {string}
 */
const searchTextHL: SearchTextHLType = {
  highlight(text: string = '', query: string = '', options: OptionsType = {}): string {
    Utils.validate.highlight(text, query, options)

    options = Utils.getOptions(options)
    if (!query) {
      return text
    }

    let modifiers = options.matchAll ? 'g' : ''
    modifiers += options.caseSensitive ? '' : 'i'
    return text.replace(new RegExp(query, modifiers), (match) => {
      return `<${options.htmlTag} class="${options.hlClass}">${match}</${options.htmlTag}>`
    })
  },
}

export default searchTextHL

// CommonJS interop. In the published CJS bundle (Vite library build) this makes
// `require('search-text-highlight')` return the object itself, so
// `require(...).highlight(...)` works for CJS consumers. Wrapped in try/catch because
// under a pure-ESM transform (e.g. Vitest importing this .ts directly) `module.exports`
// is a read-only namespace — there the ESM `export default` above already covers
// consumers, so the throw is safely ignored.
try {
  module.exports = searchTextHL
} catch {
  /* ESM context (no writable module.exports) — the ESM default export applies. */
}
