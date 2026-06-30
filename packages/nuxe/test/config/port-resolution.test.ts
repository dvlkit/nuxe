import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadNuxeConfig } from '../../lib/config'

describe('port resolution', () => {
  let savedPort: string | undefined

  beforeEach(() => {
    savedPort = process.env.PORT
  })

  afterEach(() => {
    if (savedPort === undefined) {
      delete process.env.PORT
    } else {
      process.env.PORT = savedPort
    }
  })

  function freshLoad() {
    return loadNuxeConfig({
      cwd: process.cwd(),
      dotenv: false as never,
    }).then((c) => c.server.port)
  }

  it('falls back to 3000 when no PORT env and no config', async () => {
    delete process.env.PORT
    expect(await freshLoad()).toBe(3000)
  })

  it('uses PORT env var when set, overriding the config default', async () => {
    process.env.PORT = '4001'
    expect(await freshLoad()).toBe(4001)
  })

  it('prefers the explicit PORT env over the config port', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs')
    const tmp = mkdtempSync('/tmp/nuxe-port-')
    writeFileSync(
      `${tmp}/nuxe.config.ts`,
      `import { defineConfig } from '@dvlkit/nuxe'\nexport default defineConfig({ server: { port: 3000 } })\n`,
    )
    process.env.PORT = '4002'
    try {
      const port = await loadNuxeConfig({ cwd: tmp }).then((c) => c.server.port)
      expect(port).toBe(4002)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})