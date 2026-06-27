import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolveRuntimeConfig, getPublicRuntimeConfig, camelToUpperSnake } from '../../lib/config/runtime-config'

describe('runtime-config', () => {
  let env: NodeJS.ProcessEnv

  beforeEach(() => {
    env = { ...process.env }
  })

  afterEach(() => {
    process.env = env
  })

  describe('camelToUpperSnake', () => {
    it('converts camelCase to UPPER_SNAKE_CASE', () => {
      expect(camelToUpperSnake('apiBase')).toBe('API_BASE')
      expect(camelToUpperSnake('baseURL')).toBe('BASE_URL')
      expect(camelToUpperSnake('fooBarBaz')).toBe('FOO_BAR_BAZ')
    })
  })

  describe('resolveRuntimeConfig', () => {
    it('returns defaults when no config is provided', () => {
      const config = resolveRuntimeConfig()
      expect(config).toEqual({ public: {} })
    })

    it('preserves server-only and public values', () => {
      const config = resolveRuntimeConfig({
        apiSecret: 'secret',
        public: {
          apiBase: '/api',
        },
      })
      expect(config.apiSecret).toBe('secret')
      expect(config.public.apiBase).toBe('/api')
    })

    it('overrides server values from NUXE_* env vars', () => {
      process.env.NUXE_API_SECRET = 'from-env'
      const config = resolveRuntimeConfig({
        apiSecret: 'secret',
        public: {},
      })
      expect(config.apiSecret).toBe('from-env')
    })

    it('overrides public values from NUXE_PUBLIC_* env vars', () => {
      process.env.NUXE_PUBLIC_API_BASE = 'https://api.example.com'
      const config = resolveRuntimeConfig({
        public: {
          apiBase: '/api',
        },
      })
      expect(config.public.apiBase).toBe('https://api.example.com')
    })

    it('coerces boolean and number env values', () => {
      process.env.NUXE_PUBLIC_DEBUG = 'true'
      process.env.NUXE_PUBLIC_LIMIT = '42'
      const config = resolveRuntimeConfig({
        public: {
          debug: false,
          limit: 10,
        },
      })
      expect(config.public.debug).toBe(true)
      expect(config.public.limit).toBe(42)
    })

    it('handles nested public keys', () => {
      process.env.NUXE_PUBLIC_API_TIMEOUT = '5000'
      const config = resolveRuntimeConfig({
        public: {
          api: {
            timeout: 1000,
          },
        },
      })
      expect((config.public.api as Record<string, unknown>).timeout).toBe(5000)
    })
  })

  describe('getPublicRuntimeConfig', () => {
    it('returns only public values', () => {
      const config = getPublicRuntimeConfig({
        apiSecret: 'secret',
        public: {
          apiBase: '/api',
        },
      })
      expect(config).toEqual({ public: { apiBase: '/api' } })
    })
  })
})
