import type { RouteRules } from './scanner'

export interface PageMeta {
  meta?: {
    middleware?: string | string[]
    layout?: string
    [key: string]: unknown
  }
  routeRules?: RouteRules
}

export function definePage(meta: PageMeta): void {
  // no-op at runtime; transformed away at build time
}
