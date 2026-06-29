import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadRuntimeConfig, resetRuntimeConfigCache } from '../../lib/server/config'

describe('loadRuntimeConfig (server)', () => {
  let tempDir: string
  let savedEnv: Record<string, string | undefined>

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'nuxe-runtime-config-'))
    vi.spyOn(process, 'cwd').mockImplementation(() => tempDir)
    savedEnv = { NUXE_API_BASE_URL: process.env.NUXE_API_BASE_URL }
    delete process.env.NUXE_API_BASE_URL
    resetRuntimeConfigCache()
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    resetRuntimeConfigCache()
    vi.restoreAllMocks()
  })

  function writeConfig(content: object): void {
    mkdirSync(join(tempDir, '.nuxe'), { recursive: true })
    writeFileSync(
      join(tempDir, '.nuxe', 'runtime-config.json'),
      JSON.stringify(content),
    )
  }

  it('parses the runtime-config.json file from cwd', () => {
    writeConfig({ apiBaseUrl: 'https://api.local', public: { foo: 'bar' } })

    const config = loadRuntimeConfig()
    expect(config.apiBaseUrl).toBe('https://api.local')
    expect(config.public).toEqual({ foo: 'bar' })
  })

  it('returns an empty public default when the file is missing', () => {
    const config = loadRuntimeConfig()
    expect(config.public).toEqual({})
    expect(config.apiBaseUrl).toBeUndefined()
  })

  it('caches the filesystem read across calls', () => {
    writeConfig({ tag: 'first', public: {} })

    const first = loadRuntimeConfig()
    expect(first.tag).toBe('first')

    writeConfig({ tag: 'second', public: {} })

    const second = loadRuntimeConfig()
    expect(second.tag).toBe('first')
    expect(second).toBe(first)
  })

  it('resetRuntimeConfigCache invalidates the cache', () => {
    writeConfig({ tag: 'first', public: {} })
    expect(loadRuntimeConfig().tag).toBe('first')

    writeConfig({ tag: 'second', public: {} })
    resetRuntimeConfigCache()
    expect(loadRuntimeConfig().tag).toBe('second')
  })

  it('respects NUXE_* environment variables', () => {
    writeConfig({ apiBaseUrl: 'https://default', public: {} })
    process.env.NUXE_API_BASE_URL = 'https://from-env'
    resetRuntimeConfigCache()

    const config = loadRuntimeConfig()
    expect(config.apiBaseUrl).toBe('https://from-env')
  })
})
