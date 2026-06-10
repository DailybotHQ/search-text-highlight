export interface ObjectType {
  [key: string]: any
}

export interface Class<T> {
  new (...args: any): T
}

export interface OptionsType {
  htmlTag?: string
  hlClass?: string
  matchAll?: boolean
  caseSensitive?: boolean
}

export interface UtilsType {
  validate: {
    highlight(text: string, query: string, option?: OptionsType): void
    options(options: OptionsType): void
  }
  getOptions(options: OptionsType): OptionsType
}

export interface SearchTextHLType {
  highlight: (text: string, query: string, options?: OptionsType) => string
}
