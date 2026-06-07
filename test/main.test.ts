import { describe, expect, it } from 'vitest'
import searchTextHL from '../src/index'

describe('Test search text highlight', () => {
  it('should highlight one query substring', () => {
    const text = 'This is a simple but an amazing tool for text highlight 😎.'
    const query = 'amazing'
    const result = searchTextHL.highlight(text, query)
    expect(result).toBe(
      'This is a simple but an <span class="text-highlight">amazing</span> tool for text highlight 😎.'
    )
  })

  it('should highlight multiple query substrings', () => {
    const text = 'This is a simple but an amazing tool for text highlight 😎.'
    const query = 'a'
    const result = searchTextHL.highlight(text, query)
    expect(result).toBe(
      'This is <span class="text-highlight">a</span> simple but <span class="text-highlight">a</span>n <span class="text-highlight">a</span>m<span class="text-highlight">a</span>zing tool for text highlight 😎.'
    )
  })

  it('should highlight an unicode substring', () => {
    const text = 'This is a simple but an amazing tool for text highlight 😎.'
    const query = '😎'
    const result = searchTextHL.highlight(text, query)
    expect(result).toBe(
      'This is a simple but an amazing tool for text highlight <span class="text-highlight">😎</span>.'
    )
  })

  it('should do nothing with empty queries', () => {
    const text = 'This is a simple but an amazing tool for text highlight 😎.'
    const query = ''
    const result = searchTextHL.highlight(text, query)
    expect(result).toBe(text)
  })

  it('should be able to replace the default HTML tag', () => {
    const text = 'This is a simple but an amazing tool for text highlight 😎.'
    const query = 'amazing'
    const options = { htmlTag: 'label' }
    const result = searchTextHL.highlight(text, query, options)
    expect(result).toBe(
      'This is a simple but an <label class="text-highlight">amazing</label> tool for text highlight 😎.'
    )
  })

  it('should be able to replace the default highlight class', () => {
    const text = 'This is a simple but an amazing tool for text highlight 😎.'
    const query = 'amazing'
    const options = { htmlTag: 'label', hlClass: 'custom-class' }
    const result = searchTextHL.highlight(text, query, options)
    expect(result).toBe(
      'This is a simple but an <label class="custom-class">amazing</label> tool for text highlight 😎.'
    )
  })

  it('should be able to highlight only the first query match', () => {
    const text = 'This is a simple but an amazing tool for text highlight 😎.'
    const query = 'a'
    const options = { matchAll: false }
    const result = searchTextHL.highlight(text, query, options)
    expect(result).toBe(
      'This is <span class="text-highlight">a</span> simple but an amazing tool for text highlight 😎.'
    )
  })

  it('should be able to highlight witch case sensitve match', () => {
    const text = 'This is a simple but an amazing tool for text highlight 😎.'
    const query = 'Amazing'
    const options = { caseSensitive: true }
    const result = searchTextHL.highlight(text, query, options)
    expect(result).toBe('This is a simple but an amazing tool for text highlight 😎.')
  })

  it('should throw error with not the right type parameter', () => {
    let text: any = 42
    expect(() => {
      searchTextHL.highlight(text, '')
    }).toThrow(Error)

    text = true
    expect(() => {
      searchTextHL.highlight(text, '')
    }).toThrow(Error)

    text = 'This is a simple but an amazing tool for text highlight 😎.'
    let query: any = 5
    expect(() => {
      searchTextHL.highlight(text, query)
    }).toThrow(Error)

    query = true
    expect(() => {
      searchTextHL.highlight(text, query)
    }).toThrow(Error)

    query = 'amazing'
    let options: any = true
    expect(() => {
      searchTextHL.highlight(text, query, options)
    }).toThrow(Error)

    options = { htmlTag: 563 }
    expect(() => {
      searchTextHL.highlight(text, query, options)
    }).toThrow(Error)

    options = { htmlTag: false }
    expect(() => {
      searchTextHL.highlight(text, query, options)
    }).toThrow(Error)

    options = { hlClass: 50.0 }
    expect(() => {
      searchTextHL.highlight(text, query, options)
    }).toThrow(Error)

    options = { hlClass: true }
    expect(() => {
      searchTextHL.highlight(text, query, options)
    }).toThrow(Error)

    options = { matchAll: 'true' }
    expect(() => {
      searchTextHL.highlight(text, query, options)
    }).toThrow(Error)

    options = { matchAll: 1 }
    expect(() => {
      searchTextHL.highlight(text, query, options)
    }).toThrow(Error)

    options = { caseSensitive: 42 }
    expect(() => {
      searchTextHL.highlight(text, query, options)
    }).toThrow(Error)

    options = { caseSensitive: 'false' }
    expect(() => {
      searchTextHL.highlight(text, query, options)
    }).toThrow(Error)
  })
})
