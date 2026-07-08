import { relative, sep } from 'node:path'
import type { ScannedPage } from './scanner'

export const ROUTES_HMR_CODE = `if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    const router = import.meta.hot.data.router
    if (!router) {
      import.meta.hot.invalidate('[nuxe] Cannot replace routes: no active router in hot data. Reloading.')
      return
    }
    const addedRoutes = router.getRoutes().filter((r) => !r._initial)
    router.clearRoutes()
    const next = (mod && mod.default) || []
    for (const route of next) {
      router.addRoute(route)
    }
    for (const route of router.getRoutes()) {
      route._initial = true
    }
    for (const route of addedRoutes) {
      router.addRoute(route)
    }
    router.isReady().then(() => {
      router.replace(router.currentRoute.value.fullPath).catch(() => {})
    })
  })
}

export function handleHotUpdate(router) {
  if (import.meta.hot) {
    import.meta.hot.data ||= {}
    import.meta.hot.data.router = router
    for (const route of router.getRoutes()) {
      route._initial = true
    }
  }
}
`

function serializeMeta(meta: Record<string, unknown> | undefined, routeRules?: import('./scanner').RouteRules): string {
  const combined: Record<string, unknown> = { ...meta }
  if (routeRules && Object.keys(routeRules).length > 0) {
    combined.routeRules = routeRules
  }
  if (Object.keys(combined).length === 0) return '{}'
  return JSON.stringify(combined)
}

function routeComponentPath(filePath: string, pagesRoot: string): string {
  const rel = relative(pagesRoot, filePath).split(sep).join('/')
  if (!rel || rel.startsWith('..')) {
    throw new Error(`[nuxe] page path is not under app/pages: ${filePath}`)
  }
  return `/app/pages/${rel}`
}

export function generateRoutesModule(pages: ScannedPage[], pagesRoot: string): string {
  if (pages.length === 0) {
    return `${ROUTES_HMR_CODE}\nexport default []\n`
  }

  const routes = pages
    .map((page) => {
      const meta = serializeMeta(page.meta, page.routeRules)
      return `  {\n    path: ${JSON.stringify(page.path)},\n    name: ${JSON.stringify(page.name)},\n    component: () => import('${routeComponentPath(page.filePath, pagesRoot)}'),\n    meta: ${meta},\n  }`
    })
    .join(',\n')

  return `${ROUTES_HMR_CODE}\nexport default [\n${routes}\n]\n`
}