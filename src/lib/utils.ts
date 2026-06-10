import type { OptionsType, UtilsType } from './type'

const Utils: UtilsType = {
  validate: {
    highlight(text: string, query: string, options: OptionsType): void {
      if (text && typeof text !== 'string') {
        throw new Error('The text parameter should be a string.')
      }
      if (query && typeof query !== 'string') {
        throw new Error('The query parameter should be a string.')
      }
      if (typeof options !== 'object') {
        throw new Error('The options parameter should be an object.')
      }
    },
    options(options: OptionsType = {}): void {
      if (typeof options.htmlTag !== 'undefined' && typeof options.htmlTag !== 'string') {
        throw new Error('The htmlTab option should be a string.')
      }
      if (typeof options.hlClass !== 'undefined' && typeof options.hlClass !== 'string') {
        throw new Error('The hlClass option should be a string.')
      }
      if (typeof options.matchAll !== 'undefined' && typeof options.matchAll !== 'boolean') {
        throw new Error('The matchAll option should be a boolean.')
      }
      if (typeof options.caseSensitive !== 'undefined' && typeof options.caseSensitive !== 'boolean') {
        throw new Error('The caseSensitive option should be a boolean.')
      }
    },
  },
  getOptions(options: OptionsType = {}): OptionsType {
    this.validate.options(options)
    return {
      htmlTag: options.htmlTag ? options.htmlTag : 'span',
      hlClass: options.hlClass ? options.hlClass : 'text-highlight',
      matchAll: typeof options.matchAll !== 'undefined' ? options.matchAll : true,
      caseSensitive: typeof options.caseSensitive !== 'undefined' ? options.caseSensitive : false,
    }
  },
}

export default Utils
