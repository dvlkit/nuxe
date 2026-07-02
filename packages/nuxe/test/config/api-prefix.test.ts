import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import { NuxeConfigSchema } from '../../lib/config/schema'

describe('NuxeConfigSchema — apiPrefix', () => {
  function parse(input: Record<string, unknown>) {
    return v.safeParse(NuxeConfigSchema, input)
  }

  it('defaults to "/api" when not provided', () => {
    const result = parse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.apiPrefix).toBe('/api')
    }
  })

  it('accepts a custom prefix like "/v1"', () => {
    const result = parse({ apiPrefix: '/v1' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.apiPrefix).toBe('/v1')
    }
  })

  it('accepts nested prefixes like "/api/v1"', () => {
    const result = parse({ apiPrefix: '/api/v1' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.apiPrefix).toBe('/api/v1')
    }
  })

  it('strips trailing slashes ("/api/" -> "/api")', () => {
    const result = parse({ apiPrefix: '/api/' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.apiPrefix).toBe('/api')
    }
  })

  it('rejects missing leading slash ("api")', () => {
    const result = parse({ apiPrefix: 'api' })
    expect(result.success).toBe(false)
  })

  it('rejects double slashes ("//foo")', () => {
    const result = parse({ apiPrefix: '//foo' })
    expect(result.success).toBe(false)
  })

  it('rejects just "/"', () => {
    const result = parse({ apiPrefix: '/' })
    expect(result.success).toBe(false)
  })
})