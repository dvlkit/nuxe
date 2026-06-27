import { describe, expect, it } from 'vitest'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { default: nuxePlugin } = await import('../../lib/plugin') as any

describe('nuxe error virtual module', () => {
  it('generates fallback when error component is disabled', () => {
    const plugin = nuxePlugin({ layouts: [], errorComponent: false })
    const module = plugin.load('\0virtual:nuxe/error')
    expect(module).toContain('NuxeFallbackError')
    expect(module).not.toContain("import ErrorComponent from '/app/error.vue'")
  })

  it('imports app/error.vue when error component is enabled', () => {
    const plugin = nuxePlugin({ layouts: [], errorComponent: true })
    const module = plugin.load('\0virtual:nuxe/error')
    expect(module).toContain("import ErrorComponent from '/app/error.vue'")
    expect(module).not.toContain('NuxeFallbackError')
  })
})
