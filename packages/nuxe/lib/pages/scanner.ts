import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'
import { parse as parseSFC } from '@vue/compiler-sfc'

export interface RouteRules {
  ssr?: boolean
  prerender?: boolean | string
  redirect?: string
}

export interface ScannedPage {
  filePath: string
  path: string
  pathTemplate: string
  name: string
  meta?: Record<string, unknown>
  routeRules?: RouteRules
}

const PARAM_RE = /^\[(\.\.\.)?([^\]]+)\]$/
const DEFINE_PAGE_RE = /\bdefinePage\s*\(/

function isPageFile(file: string): boolean {
  return file.endsWith('.vue') && !file.startsWith('_')
}

function extractDefinePageArg(source: string): { arg: string } | null {
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

  return { arg: source.slice(parenStart + 1, i - 1).trim() }
}

function safeEvalObjectLiteral(arg: string): Record<string, unknown> | undefined {
  try {
    // eslint-disable-next-line no-new-func
    return new Function(`return ${arg}`)() as Record<string, unknown>
  } catch {
    return undefined
  }
}

interface ExtractedPageConfig {
  meta?: Record<string, unknown>
  routeRules?: RouteRules
}

function extractPageConfig(filePath: string): ExtractedPageConfig | undefined {
  const content = readFileSync(filePath, 'utf-8')
  if (!DEFINE_PAGE_RE.test(content)) return undefined

  const { descriptor } = parseSFC(content, { filename: filePath })
  const scripts = [descriptor.script, descriptor.scriptSetup].filter(Boolean)

  for (const script of scripts) {
    if (!script) continue
    const extracted = extractDefinePageArg(script.content)
    if (!extracted) continue
    const value = safeEvalObjectLiteral(extracted.arg)
    if (!value || typeof value !== 'object') return undefined

    const config: ExtractedPageConfig = {}
    if ('meta' in value) config.meta = value.meta as Record<string, unknown>
    if ('routeRules' in value) config.routeRules = value.routeRules as RouteRules
    return config
  }

  return undefined
}

function isIgnoredSegment(segment: string): boolean {
  return segment.startsWith('_')
}

function segmentToRoute(segment: string): { path: string; template: string; paramName?: string; catchAll?: boolean } {
  const match = PARAM_RE.exec(segment)
  if (!match) {
    return { path: `/${segment}`, template: `/${segment}` }
  }

  const [, spread, name] = match
  if (spread) {
    return { path: `/:${name}(.*)*`, template: `/[...${name}]`, paramName: name, catchAll: true }
  }

  return { path: `/:${name}`, template: `/[${name}]`, paramName: name }
}

function scanDir(dir: string, baseRoute: string, pages: ScannedPage[]): void {
  if (!existsSync(dir)) return

  const entries = readdirSync(dir, { withFileTypes: true })

  const files = entries
    .filter((e) => e.isFile() && isPageFile(e.name))
    .sort((a, b) => a.name.localeCompare(b.name))

  const dirs = entries
    .filter((e) => e.isDirectory() && !isIgnoredSegment(e.name))
    .sort((a, b) => a.name.localeCompare(b.name))

  for (const file of files) {
    const nameWithoutExt = file.name.slice(0, -extname(file.name).length)
    if (isIgnoredSegment(nameWithoutExt)) continue

    const filePath = join(dir, file.name)
    const relativePath = relative(baseRoute, filePath)
    const segments = relativePath.split(sep).map((s) => s.replace(/\.vue$/, ''))

    let routePath = ''
    let routePathTemplate = ''
    let routeNameParts: string[] = []

    for (const segment of segments) {
      if (segment.startsWith('(') && segment.endsWith(')')) {
        routeNameParts.push(segment.slice(1, -1))
        continue
      }

      const { path, template } = segmentToRoute(segment)
      routePath += path
      routePathTemplate += template
      routeNameParts.push(segment.replace(/\[|\]|\.\.\./g, ''))
    }

    if (nameWithoutExt === 'index' && routePath.length > 1) {
      routePath = routePath.replace(/\/index$/, '')
      routePathTemplate = routePathTemplate.replace(/\/index$/, '')
    }

    if (routePath === '') routePath = '/'
    if (routePathTemplate === '') routePathTemplate = '/'

    const config = extractPageConfig(filePath)
    pages.push({
      filePath,
      path: routePath,
      pathTemplate: routePathTemplate,
      name: routeNameParts.join('-').replace(/^-|-$/g, '') || 'index',
      meta: config?.meta,
      routeRules: config?.routeRules,
    })
  }

  for (const subdir of dirs) {
    scanDir(join(dir, subdir.name), baseRoute, pages)
  }
}

export function scanPages(cwd: string, pagesDir = 'app/pages'): ScannedPage[] {
  const dir = join(cwd, pagesDir)
  const pages: ScannedPage[] = []
  scanDir(dir, dir, pages)
  return pages
}
