import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

export interface ScannedMiddleware {
  name: string
  path: string
  global: boolean
}

export function scanMiddlewares(cwd: string): ScannedMiddleware[] {
  const dir = resolve(cwd, 'app/middleware')
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.startsWith('_'))
    .map(f => {
      const global = /\.global\.(ts|js)$/.test(f)
      const stripped = f.replace(/\.global\.(ts|js)$/, '').replace(/\.(ts|js)$/, '')
      return {
        name: stripped,
        path: resolve(dir, f),
        global
      }
    })
    .filter(m => m.name.length > 0)
}