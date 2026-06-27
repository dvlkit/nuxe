import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

export interface ScannedPlugin {
  name: string
  path: string
  mode: 'all' | 'client' | 'server'
}

function parsePluginName(stripped: string): { name: string; order: number } {
  const match = /^(\d+)[-_]/.exec(stripped)
  if (match) {
    return {
      name: stripped.slice(match[0].length),
      order: Number.parseInt(match[1], 10),
    }
  }
  return { name: stripped, order: Number.MAX_SAFE_INTEGER }
}

export function scanPlugins(cwd: string): ScannedPlugin[] {
  const dir = resolve(cwd, 'app/plugins')
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.startsWith('_'))
    .map(f => {
      const mode: ScannedPlugin['mode'] = f.endsWith('.server.ts') || f.endsWith('.server.js')
        ? 'server'
        : f.endsWith('.client.ts') || f.endsWith('.client.js')
          ? 'client'
          : 'all'

      const stripped = f
        .replace(/\.server\.(ts|js)$/, '')
        .replace(/\.client\.(ts|js)$/, '')
        .replace(/\.(ts|js)$/, '')

      const parsed = parsePluginName(stripped)

      return {
        name: parsed.name,
        order: parsed.order,
        path: resolve(dir, f),
        mode,
      }
    })
    .filter(p => p.name.length > 0 && p.name !== 'index')
    .sort((a, b) => a.order - b.order)
    .map(({ name, path, mode }) => ({ name, path, mode }))
}
