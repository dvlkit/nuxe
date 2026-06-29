import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadRuntimeConfig,
  resolveRuntimeConfig,
} from '../../lib/server/config'

describe('loadRuntimeConfig (server)', () => {
  let tempDir: string
  let savedEnv: Record<string, string | undefined>

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'nuxe-runtime-config-'))
    vi.spyOn(process, 'cwd').mockImplementation(() => tempDir)
    savedEnv = { NUXE_API_BASE_URL: process.env.NUXE_API_BASE_URL }
    delete process.env.NUXE_API_BASE_URL
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
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

  it('overrides top-level keys from NUXE_* env vars', () => {
    writeConfig({ apiBaseUrl: 'https://default' })
    process.env.NUXE_API_BASE_URL = 'https://from-env'

    const config = loadRuntimeConfig()
    expect(config.apiBaseUrl).toBe('https://from-env')
  })

  it('re-evaluates env vars per call (no cache)', () => {
    writeConfig({ apiBaseUrl: 'seed' })

    const before = loadRuntimeConfig()
    expect(before.apiBaseUrl).toBe('seed')

    process.env.NUXE_API_BASE_URL = 'https://from-env'
    const after = loadRuntimeConfig()
    expect(after.apiBaseUrl).toBe('https://from-env')

    expect(after).not.toBe(before)
  })

  it('auto-injects a key from NUXE_* env var not declared in the config', () => {
    writeConfig({ public: {} })
    process.env.NUXE_API_BASE_URL = 'https://injected'

    const config = loadRuntimeConfig()
    expect(config.apiBaseUrl).toBe('https://injected')
  })

  it('auto-injects NUXE_PUBLIC_* into public', () => {
    writeConfig({})
    process.env.NUXE_PUBLIC_FOO = 'bar'

    const config = loadRuntimeConfig()
    expect(config.public.foo).toBe('bar')
  })

  it('skips reserved NUXE_* env vars (NUXE_SILENT, NUXE_DEV, ...)', () => {
    writeConfig({})
    process.env.NUXE_SILENT = 'true'
    process.env.NUXE_DEV = 'true'
    process.env.NUXE_BASE_URL = 'http://localhost:4000'

    const config = loadRuntimeConfig()
    expect(config).not.toHaveProperty('silent')
    expect(config).not.toHaveProperty('dev')
    expect(config).not.toHaveProperty('baseUrl')
  })

  it('coerces boolean values from NUXE_* env vars', () => {
    writeConfig({})
    process.env.NUXE_DEBUG = 'true'

    const config = loadRuntimeConfig()
    expect(config.debug).toBe(true)
  })

  it('coerces numeric values from NUXE_* env vars', () => {
    writeConfig({})
    process.env.NUXE_PORT = '8080'

    const config = loadRuntimeConfig()
    expect(config.port).toBe(8080)
  })
})

describe('resolveRuntimeConfig (pure)', () => {
  let savedEnv: Record<string, string | undefined>

  beforeEach(() => {
    savedEnv = {}
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('NUXE_')) {
        savedEnv[key] = process.env[key]
        delete process.env[key]
      }
    }
  })

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it('returns an empty config by default', () => {
    const config = resolveRuntimeConfig()
    expect(config.public).toEqual({})
  })

  it('preserves top-level scalar values from the input', () => {
    const config = resolveRuntimeConfig({ apiBaseUrl: 'x', public: {} })
    expect(config.apiBaseUrl).toBe('x')
  })

  it('auto-injects a key from NUXE_* env even when starting from a default', () => {
    process.env.NUXE_API_BASE_URL = 'https://injected'
    const config = resolveRuntimeConfig()
    expect(config.apiBaseUrl).toBe('https://injected')
  })

  it('routes NUXE_PUBLIC_* into public', () => {
    process.env.NUXE_PUBLIC_TITLE = 'Nuxe'
    const config = resolveRuntimeConfig()
    expect(config.public.title).toBe('Nuxe')
  })
})
