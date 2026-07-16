import { describe, it, expect } from 'vitest'
import * as v from 'valibot'
import { NuxeConfigSchema } from '../../lib/config/define-config'

describe('NuxeConfigSchema — runtimeConfig undefined leaves', () => {
  it('acepta env vars no definidas como undefined dentro de public', () => {
    const cfg = {
      runtimeConfig: {
        public: { websiteUrl: undefined },
      },
    }
    const result = v.safeParse(NuxeConfigSchema, cfg)
    if (!result.success) {
      for (const issue of result.issues) {
        console.log('  -', v.getDotPath(issue) || '<root>', '::', issue.message)
      }
    }
    expect(result.success).toBe(true)
  })

  it('acepta env vars no definidas en primer nivel del runtimeConfig', () => {
    const cfg = {
      runtimeConfig: {
        apiBaseUrl: undefined,
        public: {},
      },
    }
    const result = v.safeParse(NuxeConfigSchema, cfg)
    if (!result.success) {
      for (const issue of result.issues) {
        console.log('  -', v.getDotPath(issue) || '<root>', '::', issue.message)
      }
    }
    expect(result.success).toBe(true)
  })
})
