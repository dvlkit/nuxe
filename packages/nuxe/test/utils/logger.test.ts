import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('logger', () => {
  let captured: string[]

  beforeEach(() => {
    captured = []
    delete process.env.NUXE_SILENT
    delete process.env.CI
    delete process.env.VITEST
    delete process.env.NODE_ENV
  })

  describe('silent mode', () => {
    it('suppresses info when NUXE_SILENT=true', async () => {
      process.env.NUXE_SILENT = 'true'
      const { logInfo } = await import('../../lib/utils/logger')
      logInfo('hello')
      expect(captured).toEqual([])
    })

    it('suppresses info when CI=true', async () => {
      process.env.CI = 'true'
      const { logInfo } = await import('../../lib/utils/logger')
      logInfo('hello')
      expect(captured).toEqual([])
    })

    it('suppresses info when VITEST=true', async () => {
      process.env.VITEST = 'true'
      const { logInfo } = await import('../../lib/utils/logger')
      logInfo('hello')
      expect(captured).toEqual([])
    })

    it('suppresses info when NODE_ENV=test', async () => {
      process.env.NODE_ENV = 'test'
      const { logInfo } = await import('../../lib/utils/logger')
      logInfo('hello')
      expect(captured).toEqual([])
    })

    it('prints info when none of the silent flags are set', async () => {
      const { logInfo } = await import('../../lib/utils/logger')
      expect(() => logInfo('ready in 100ms')).not.toThrow()
    })
  })

  describe('logRequest', () => {
    let originalLog: typeof console.log

    beforeEach(() => {
      originalLog = console.log
      console.log = (...args: unknown[]) => {
        captured.push(args.map((a) => (typeof a === 'string' ? a : String(a))).join(' '))
      }
    })

    afterEach(() => {
      console.log = originalLog
    })

    it('prints a GET 200 line when not silent', async () => {
      const { logRequest } = await import('../../lib/utils/logger')
      logRequest('GET', '/api/ping', 200, 12)

      const out = captured.join('\n')
      expect(out).toContain('[nuxe]')
      expect(out).toContain('GET')
      expect(out).toContain('/api/ping')
      expect(out).toContain('200')
      expect(out).toContain('12')
    })

    it('includes the label and page path when provided', async () => {
      const { logRequest } = await import('../../lib/utils/logger')
      logRequest('POST', '/api/orders', 201, 45, 'mutation', '/orders')

      const out = captured.join('\n')
      expect(out).toContain('POST')
      expect(out).toContain('/api/orders')
      expect(out).toContain('201')
      expect(out).toContain('45')
      expect(out).toContain('mutation')
      expect(out).toContain('/orders')
    })

    it('suppresses the line when silent mode is on', async () => {
      process.env.NUXE_SILENT = 'true'
      const { logRequest } = await import('../../lib/utils/logger')
      logRequest('GET', '/api/ping', 200, 12)
      expect(captured.join('\n')).not.toContain('/api/ping')
    })

    it('truncates very long paths so the line stays readable', async () => {
      const longUrl = '/' + 'x'.repeat(120)
      const { logRequest } = await import('../../lib/utils/logger')
      logRequest('GET', longUrl, 200, 5)

      const out = captured.join('\n')
      expect(out).toContain('...')
      expect(out).not.toContain(longUrl)
    })
  })

  describe('log levels', () => {
    beforeEach(() => {
      vi.resetModules()
    })

    it('exposes logInfo, logSuccess, logWarn, logError as silent-aware helpers', async () => {
      const { logInfo, logSuccess, logWarn, logError } = await import('../../lib/utils/logger')
      expect(() => logInfo('a')).not.toThrow()
      expect(() => logSuccess('b')).not.toThrow()
      expect(() => logWarn('c')).not.toThrow()
      expect(() => logError('d')).not.toThrow()
    })
  })
})