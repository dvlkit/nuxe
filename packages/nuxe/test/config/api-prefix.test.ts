import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import { NuxeConfigSchema } from '../../lib/config/schema'

describe('NuxeConfigSchema — server.apiPrefix', () => {
  function parse(input: Record<string, unknown>) {
    return v.safeParse(NuxeConfigSchema, input)
  }

  it('defaults to "/api" when server is not provided', () => {
    const result = parse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.server?.apiPrefix).toBe('/api')
    }
  })

  it('defaults to "/api" when server is provided but apiPrefix is omitted', () => {
    const result = parse({ server: { port: 4000 } })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.server?.apiPrefix).toBe('/api')
    }
  })

  it('accepts a custom prefix like "/v1"', () => {
    const result = parse({ server: { apiPrefix: '/v1' } })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.server?.apiPrefix).toBe('/v1')
    }
  })

  it('accepts nested prefixes like "/api/v1"', () => {
    const result = parse({ server: { apiPrefix: '/api/v1' } })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.server?.apiPrefix).toBe('/api/v1')
    }
  })

  it('strips trailing slashes ("/api/" -> "/api")', () => {
    const result = parse({ server: { apiPrefix: '/api/' } })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.server?.apiPrefix).toBe('/api')
    }
  })

  it('rejects missing leading slash ("api")', () => {
    const result = parse({ server: { apiPrefix: 'api' } })
    expect(result.success).toBe(false)
  })

  it('rejects double slashes ("//foo")', () => {
    const result = parse({ server: { apiPrefix: '//foo' } })
    expect(result.success).toBe(false)
  })

  it('rejects just "/"', () => {
    const result = parse({ server: { apiPrefix: '/' } })
    expect(result.success).toBe(false)
  })
})