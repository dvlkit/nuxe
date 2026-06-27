import type { Plugin } from 'vite'
import { parse as parseSFC } from '@vue/compiler-sfc'
import MagicString from 'magic-string'

const DEFINE_PAGE_RE = /\bdefinePage\s*\(/

interface ExtractResult {
  start: number
  end: number
  arg: string
}

function extractDefinePageArg(source: string): ExtractResult | null {
  const match = DEFINE_PAGE_RE.exec(source)
  if (!match) return null

  const parenStart = source.indexOf('(', match.index)
  if (parenStart === -1) return null

  let depth = 1
  let i = parenStart + 1

  while (i < source.length && depth > 0) {
    const ch = source[i]

    if (ch === '(') {
      depth++
    } else if (ch === ')') {
      depth--
    } else if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch
      i++
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\') i++
        i++
      }
    } else if (ch === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++
    } else if (ch === '/' && source[i + 1] === '*') {
      i += 2
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++
      if (i < source.length) i++
    }

    i++
  }

  if (depth !== 0) return null

  return {
    start: match.index,
    end: i,
    arg: source.slice(parenStart + 1, i - 1).trim(),
  }
}

export function transformDefinePage(code: string, id: string): string | undefined {
  if (!DEFINE_PAGE_RE.test(code)) return undefined

  const { descriptor } = parseSFC(code, { filename: id })
  const scriptSetup = descriptor.scriptSetup
  if (!scriptSetup) return undefined

  const source = scriptSetup.content
  const extracted = extractDefinePageArg(source)
  if (!extracted) return undefined

  const s = new MagicString(code)

  const absoluteStart = scriptSetup.loc.start.offset + extracted.start
  const absoluteEnd = scriptSetup.loc.start.offset + extracted.end
  s.overwrite(absoluteStart, absoluteEnd, `const __nuxe_page_meta = ${extracted.arg}`)

  return s.toString()
}

export default function nuxePageMetaPlugin(): Plugin {
  return {
    name: 'nuxe:page-meta',
    enforce: 'pre',

    transform(code, id) {
      if (!id.endsWith('.vue')) return undefined
      const transformed = transformDefinePage(code, id)
      return transformed === undefined ? undefined : { code: transformed, map: null }
    },
  }
}
