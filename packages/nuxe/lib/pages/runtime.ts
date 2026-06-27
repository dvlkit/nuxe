export interface PageMeta {
  meta?: Record<string, unknown>
  routeRules?: Record<string, unknown>
  [key: string]: unknown
}

export function definePage(meta: PageMeta): void {
  // no-op at runtime; transformed away at build time
}
