import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

export interface ScannedMiddleware {
  name: string
  path: string
  global: boolean
  serverOnly: boolean
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

      return {
        name: stripped,
        path: resolve(dir, f),
        global,
        serverOnly,
      }
    })
    .filter(m => m.name.length > 0 && m.name !== 'index')
}