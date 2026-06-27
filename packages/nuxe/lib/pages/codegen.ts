import type { ScannedPage } from './scanner'

function slugify(filePath: string): string {
  return filePath
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

function serializeMeta(meta: Record<string, unknown> | undefined): string {
  if (!meta || Object.keys(meta).length === 0) return '{}'
  return JSON.stringify(meta)
}

function routeComponentPath(filePath: string): string {
  const relative = filePath.split('/app/pages/').pop()
  if (!relative) throw new Error(`[nuxe] page path is not under app/pages: ${filePath}`)
  return `/app/pages/${relative}`
}

export function generateRoutesModule(pages: ScannedPage[]): string {
  if (pages.length === 0) {
    return 'export const routes = []\n'
  }

  const routes = pages
    .map((page) => {
      const meta = serializeMeta(page.meta)
      return `  {\n    path: ${JSON.stringify(page.path)},\n    name: ${JSON.stringify(page.name)},\n    component: () => import('${routeComponentPath(page.filePath)}'),\n    meta: ${meta},\n  }`
    })
    .join(',\n')

  return `export const routes = [\n${routes}\n]\n`
}
