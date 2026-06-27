import { describe, expect, it } from 'vitest'
import { generateClientPluginsModule, generateServerPluginsModule } from '../../lib/plugins/codegen'
import type { ScannedPlugin } from '../../lib/plugins/scanner'

describe('plugin codegen', () => {
  const plugins: ScannedPlugin[] = [
    { name: 'analytics', path: '/app/plugins/analytics.ts', mode: 'all' },
    { name: 'clientOnly', path: '/app/plugins/clientOnly.client.ts', mode: 'client' },
    { name: 'serverOnly', path: '/app/plugins/serverOnly.server.ts', mode: 'server' },
  ]

  it('generates client module excluding server-only plugins', () => {
    const code = generateClientPluginsModule(plugins)
    expect(code).toContain('import __plugin_0 from "/app/plugins/analytics.ts"')
    expect(code).toContain('import __plugin_1 from "/app/plugins/clientOnly.client.ts"')
    expect(code).not.toContain('serverOnly')
    expect(code).toContain('export const plugins = [')
  })

  it('generates server module excluding client-only plugins', () => {
    const code = generateServerPluginsModule(plugins)
    expect(code).toContain('import __plugin_0 from "/app/plugins/analytics.ts"')
    expect(code).toContain('import __plugin_1 from "/app/plugins/serverOnly.server.ts"')
    expect(code).not.toContain('clientOnly')
  })

  it('returns empty array when no plugins match', () => {
    const code = generateClientPluginsModule([])
    expect(code).toBe('export const plugins = []\n')
  })
})
