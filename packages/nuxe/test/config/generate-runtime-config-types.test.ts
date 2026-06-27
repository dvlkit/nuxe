import { describe, it, expect } from 'vitest'
import { generateRuntimeConfigTypes } from '../../lib/config/generate-runtime-config-types'

describe('generateRuntimeConfigTypes', () => {
  it('generates types for public config', () => {
    const types = generateRuntimeConfigTypes({
      public: {
        apiBase: '/api',
        debug: true,
      },
    })
    expect(types).toContain('apiBase: string')
    expect(types).toContain('debug: boolean')
    expect(types).toContain('public: {')
  })

  it('generates types for server-only config', () => {
    const types = generateRuntimeConfigTypes({
      apiSecret: 'secret',
      public: {},
    })
    expect(types).toContain('apiSecret: string')
  })

  it('generates types for nested public config', () => {
    const types = generateRuntimeConfigTypes({
      public: {
        api: {
          base: '/api',
          timeout: 5000,
        },
      },
    })
    expect(types).toContain('base: string')
    expect(types).toContain('timeout: number')
  })
})
