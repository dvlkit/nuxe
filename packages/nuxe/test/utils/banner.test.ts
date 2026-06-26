import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('banner', () => {
  let originalLog: typeof console.log
  let captured: string[]

  beforeEach(() => {
    originalLog = console.log
    captured = []
    console.log = (...args: unknown[]) => {
      captured.push(args.map((a) => (typeof a === 'string' ? a : String(a))).join(' '))
    }
    delete process.env.NUXE_SILENT
    delete process.env.CI
    delete process.env.VITEST
    delete process.env.NODE_ENV
  })

  afterEach(() => {
    console.log = originalLog
    delete process.env.NUXE_SILENT
    delete process.env.CI
    delete process.env.VITEST
    delete process.env.NODE_ENV
  })

  describe('printDevBanner', () => {
    it('prints the wordmark, version, and local URL', async () => {
      const { printDevBanner } = await import('../../lib/utils/banner')
      printDevBanner(3000, 123)

      const out = captured.join('\n')
      expect(out).toContain('nuxe')
      expect(out).toContain('v')
      expect(out).toContain('http://localhost:3000/')
      expect(out).toContain('ready in 123ms')
    })

    it('omits the "ready in Xms" line when durationMs is not provided', async () => {
      const { printDevBanner } = await import('../../lib/utils/banner')
      printDevBanner(3000)

      expect(captured.join('\n')).not.toContain('ready in')
    })

    it('falls back to a "use --host to expose" hint when no network interface is found', async () => {
      const { getNetworkUrl } = await import('../../lib/utils/banner')
      expect(getNetworkUrl(3000, {})).toBeNull()
    })
  })

  describe('silent mode', () => {
    it('suppresses output when NUXE_SILENT=true', async () => {
      process.env.NUXE_SILENT = 'true'
      const { printDevBanner } = await import('../../lib/utils/banner')
      printDevBanner(3000, 100)
      expect(captured).toEqual([])
    })

    it('suppresses output when CI=true', async () => {
      process.env.CI = 'true'
      const { printDevBanner } = await import('../../lib/utils/banner')
      printDevBanner(3000, 100)
      expect(captured).toEqual([])
    })

    it('suppresses output when VITEST=true', async () => {
      process.env.VITEST = 'true'
      const { printDevBanner } = await import('../../lib/utils/banner')
      printDevBanner(3000, 100)
      expect(captured).toEqual([])
    })

    it('suppresses output when NODE_ENV=test', async () => {
      process.env.NODE_ENV = 'test'
      const { printDevBanner } = await import('../../lib/utils/banner')
      printDevBanner(3000, 100)
      expect(captured).toEqual([])
    })

    it('prints when none of the silent flags are set', async () => {
      const { printDevBanner } = await import('../../lib/utils/banner')
      printDevBanner(3000, 100)
      expect(captured.length).toBeGreaterThan(0)
    })
  })

  describe('logReady', () => {
    it('prints urls and ready time without the wordmark', async () => {
      const { logReady } = await import('../../lib/utils/banner')
      logReady({ local: 'http://localhost:4000/', network: 'http://192.168.0.1:4000/' }, 250)

      const out = captured.join('\n')
      expect(out).toContain('ready in 250ms')
      expect(out).toContain('http://localhost:4000/')
      expect(out).toContain('http://192.168.0.1:4000/')
      expect(out).not.toMatch(/NUXE/)
    })

    it('falls back to "use --host to expose" when network is omitted', async () => {
      const { logReady } = await import('../../lib/utils/banner')
      logReady({ local: 'http://localhost:4000/' }, 100)

      expect(captured.join('\n')).toContain('use --host to expose')
    })
  })

  describe('NUXE_VERSION', () => {
    it('reads the version from package.json', async () => {
      const { NUXE_VERSION } = await import('../../lib/utils/banner')
      expect(NUXE_VERSION).toMatch(/^\d+\.\d+\.\d+/)
    })
  })
})