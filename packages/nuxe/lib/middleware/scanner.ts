import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

export interface ScannedMiddleware {
  name: string
  path: string
  global: boolean
  serverOnly: boolean
}

function parseMiddlewareName(stripped: string): { name: string; order: number } {
  const match = /^(\d+)[-_]/.exec(stripped)
  if (match) {
    return {
      name: stripped.slice(match[0].length),
      order: Number.parseInt(match[1], 10),
    }
  }
  return { name: stripped, order: Number.MAX_SAFE_INTEGER }
}

export function scanMiddlewares(cwd: string): ScannedMiddleware[] {
  const dir = resolve(cwd, 'app/middleware')
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.startsWith('_'))
    .map(f => {
      const serverOnly = /\.server\.(global\.)?(ts|js)$/.test(f) || /\.global\.server\.(ts|js)$/.test(f)
      const global = /\.global\.(server\.)?(ts|js)$/.test(f) || /\.server\.global\.(ts|js)$/.test(f)

      const stripped = f
        .replace(/\.server\.global\.(ts|js)$/, '')
        .replace(/\.global\.server\.(ts|js)$/, '')
        .replace(/\.server\.(ts|js)$/, '')
        .replace(/\.global\.(ts|js)$/, '')
        .replace(/\.(ts|js)$/, '')

      const parsed = parseMiddlewareName(stripped)

      return {
        name: parsed.name,
        order: parsed.order,
        path: resolve(dir, f),
        global,
        serverOnly,
      }
    })
    .filter(m => m.name.length > 0 && m.name !== 'index')
    .sort((a, b) => a.order - b.order)
    .map(({ name, path, global, serverOnly }) => ({ name, path, global, serverOnly }))
}