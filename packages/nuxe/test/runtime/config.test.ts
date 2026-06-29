import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent } from 'vue'
import {
  loadRuntimeConfig,
  provideRuntimeConfig,
  useRuntimeConfig,
} from '../../lib'
import { resetRuntimeConfigCache } from '../../lib/runtime/config'

describe('runtime config', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'nuxe-runtime-config-'))
    vi.spyOn(process, 'cwd').mockImplementation(() => tempDir)
    resetRuntimeConfigCache()
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
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

  it('falls back to filesystem config when no Vue app provides one', () => {
    writeConfig({ apiBaseUrl: 'https://api.local', public: { foo: 'bar' } })
    resetRuntimeConfigCache()

    const config = useRuntimeConfig()
    expect(config.apiBaseUrl).toBe('https://api.local')
    expect(config.public).toEqual({ foo: 'bar' })
  })

  it('returns empty defaults when the filesystem file is missing', () => {
    const config = useRuntimeConfig()
    expect(config.public).toEqual({})
    expect(config.apiBaseUrl).toBeUndefined()
  })

  it('caches the filesystem read across calls', () => {
    writeConfig({ tag: 'first', public: {} })
    resetRuntimeConfigCache()

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

  it('inside a Vue app, prefers the provideRuntimeConfig value', () => {
    const app = createSSRApp(defineComponent({ render: () => null }))
    const provided = { apiBaseUrl: 'https://provided', public: { x: 1 } }
    provideRuntimeConfig(app, provided)

    let config: ReturnType<typeof useRuntimeConfig>
    app.runWithContext(() => {
      config = useRuntimeConfig()
    })

    expect(config!).toBe(provided)
  })

  it('inside a Vue app without a provider, falls back to filesystem', () => {
    writeConfig({ apiBaseUrl: 'https://fs', public: { x: 1 } })
    resetRuntimeConfigCache()

    const app = createSSRApp(defineComponent({ render: () => null }))
    let config: ReturnType<typeof useRuntimeConfig>
    app.runWithContext(() => {
      config = useRuntimeConfig()
    })

    expect(config!.apiBaseUrl).toBe('https://fs')
  })
})
