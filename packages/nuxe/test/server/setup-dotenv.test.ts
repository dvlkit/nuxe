import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('setupRuntimeEnv + loadRuntimeConfig integration', () => {
  let tempDir: string
  let savedEnv: Record<string, string | undefined>

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'nuxe-setup-dotenv-'))
    vi.spyOn(process, 'cwd').mockImplementation(() => tempDir)
    savedEnv = {}
    for (const key of ['NUXE_API_BASE_URL', 'NUXE_PUBLIC_TITLE', 'NODE_ENV']) {
      savedEnv[key] = process.env[key]
      delete process.env[key]
    }
    vi.resetModules()
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    vi.restoreAllMocks()
  })

  it('loads .env into process.env before loadRuntimeConfig runs', async () => {
    writeFileSync(join(tempDir, '.env'), 'NUXE_API_BASE_URL=http://from-env-file\n')
    const { setupRuntimeEnv } = await import('../../lib/config/config.js')
    await setupRuntimeEnv(tempDir)
    expect(process.env.NUXE_API_BASE_URL).toBe('http://from-env-file')

    const { loadRuntimeConfig } = await import('../../lib/server/config.js')
    const config = loadRuntimeConfig()
    expect(config.apiBaseUrl).toBe('http://from-env-file')
  })

  it('loads .env.local into process.env (the Luis regression)', async () => {
    writeFileSync(join(tempDir, '.env.local'), 'NUXE_API_BASE_URL=http://from-env-local\n')
    const { setupRuntimeEnv } = await import('../../lib/config/config.js')
    await setupRuntimeEnv(tempDir)
    expect(process.env.NUXE_API_BASE_URL).toBe('http://from-env-local')

    const { loadRuntimeConfig } = await import('../../lib/server/config.js')
    const config = loadRuntimeConfig()
    expect(config.apiBaseUrl).toBe('http://from-env-local')
  })

  it('populates public runtimeConfig from NUXE_PUBLIC_* in .env.local', async () => {
    writeFileSync(
      join(tempDir, '.env.local'),
      'NUXE_PUBLIC_TITLE=HiFromLocal\nNUXE_PUBLIC_API_TIMEOUT=5000\n',
    )
    const { setupRuntimeEnv } = await import('../../lib/config/config.js')
    await setupRuntimeEnv(tempDir)

    const { loadRuntimeConfig } = await import('../../lib/server/config.js')
    const config = loadRuntimeConfig()
    expect(config.public).toMatchObject({ title: 'HiFromLocal' })
  })

  it('is idempotent across multiple calls (same cwd)', async () => {
    writeFileSync(join(tempDir, '.env'), 'NUXE_API_BASE_URL=http://once\n')
    const { setupRuntimeEnv } = await import('../../lib/config/config.js')
    await setupRuntimeEnv(tempDir)
    await setupRuntimeEnv(tempDir)
    await setupRuntimeEnv(tempDir)
    expect(process.env.NUXE_API_BASE_URL).toBe('http://once')
  })
})
