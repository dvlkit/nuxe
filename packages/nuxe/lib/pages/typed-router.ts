import type { ScannedPage } from './scanner'

function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function pathTemplateToPathType(template: string): string {
  const replaced = template
    .replace(/\[\.{3}[^\]]+\]/g, '${string}')
    .replace(/\[([^\]]+)\]/g, '${string}')
  return '`' + replaced.replace(/`/g, '\\`') + '`'
}

function namedLocationTypeForRoute(page: ScannedPage): string {
  const paramsType = paramsTypeForRoute(page)
  if (paramsType === 'Record<never, never>') {
    return `{ name: '${escapeString(page.name)}' }`
  }
  return `{ name: '${escapeString(page.name)}'; params: ${paramsType} }`
}

function paramsTypeForRoute(page: ScannedPage): string {
  const params: { name: string; catchAll: boolean }[] = []
  const paramRe = /:([a-zA-Z0-9_]+)(?:\(.*?\))?\*?/g
  let match: RegExpExecArray | null

  while ((match = paramRe.exec(page.path)) !== null) {
    const name = match[1]
    const catchAll = page.path.includes(`:${name}(.*)*`)
    params.push({ name, catchAll })
  }

  if (params.length === 0) {
    return 'Record<never, never>'
  }

  const entries = params.map(({ name, catchAll }) => {
    const type = catchAll ? 'ParamValueZeroOrMore<false>' : 'ParamValue<false>'
    return `${name}: ${type}`
  })

  return `{ ${entries.join('; ')} }`
}

export function generateTypedRouter(pages: ScannedPage[]): string {
  const hasPages = pages.length > 0
  const recordInfoImport = hasPages
    ? 'import type { RouteRecordInfo, ParamValue, ParamValueZeroOrMore } from \'vue-router\''
    : 'import type { RouteRecordInfo } from \'vue-router\''

  const mapEntries = pages
    .map((page) => {
      const paramsType = paramsTypeForRoute(page)
      return `  '${escapeString(page.name)}': RouteRecordInfo<'${escapeString(page.name)}', '${escapeString(page.pathTemplate)}', ${paramsType}, ${paramsType}>`
    })
    .join('\n')

  const routePaths = pages.map((page) => `  | ${pathTemplateToPathType(page.pathTemplate)}`).join('\n') || '  never'
  const routeNamedLocations = pages.map((page) => `  | ${namedLocationTypeForRoute(page)}`).join('\n') || '  never'

  return `${recordInfoImport}

declare module 'vue-router' {
  interface TypesConfig {
    RouteNamedMap: RouteNamedMap
  }
}

export interface RouteNamedMap {
${mapEntries || '  // no routes'}
}

export type RoutePaths =
${routePaths}

export type RouteNamedLocation =
${routeNamedLocations}

export type NuxeRouteLocationRaw = RoutePaths | RouteNamedLocation
`
}
