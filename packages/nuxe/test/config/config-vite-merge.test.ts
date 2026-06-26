import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNuxeProjectSetup } from '../../lib/nuxe-setup'
import { loadNuxeConfig } from '../../lib/config'
import type { UserConfig } from 'vite'

describe('defineConfig({ vite: {...} }) merge', () => {
  it("appends the user's plugins to nuxe's base", async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'nuxe-config-merge-'))
    try {
      const customMarker = 'custom-plugin-marker-' + Math.random().toString(36).slice(2)
      mkdirSync(join(cwd, 'app'), { recursive: true })
      writeFileSync(
        join(cwd, 'nuxe.config.ts'),
        [
          'import { defineConfig } from "@dvlkit/nuxe"',
          'export default defineConfig({',
          '  vite: {',
          '    plugins: [{',
          `      name: "${customMarker}"`,
          '    }]',
          '  }',
          '})',
        ].join('\n'),
      )
      writeFileSync(join(cwd, 'app', '.keep'), '')

      const config = await loadNuxeConfig({ cwd })
      const setup = await createNuxeProjectSetup(cwd, config)

      const pluginNames = (setup.baseConfig.plugins ?? []).map(
        (p) => (p as { name?: string }).name,
      )
      expect(pluginNames).toContain(customMarker)
      expect(pluginNames).toEqual(expect.arrayContaining([
        'vite:vue',
        'unplugin-auto-import',
      ]))
    } finally {
      rmSync(cwd, { recursive: true, force: true })
    }
  })

  it("merges the user's resolve.alias on top of nuxe's", async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'nuxe-config-merge-'))
    try {
      writeFileSync(
        join(cwd, 'nuxe.config.ts'),
        [
          'import { defineConfig } from "@dvlkit/nuxe"',
          'export default defineConfig({',
          '  vite: {',
          '    resolve: {',
          '      alias: { "@my-ui": "/src/ui" }',
          '    }',
          '  }',
          '})',
        ].join('\n'),
      )
      mkdirSync(join(cwd, 'app'), { recursive: true })
      writeFileSync(join(cwd, 'app', '.keep'), '')

      const config = await loadNuxeConfig({ cwd })
      const setup = await createNuxeProjectSetup(cwd, config)

      const alias = (setup.baseConfig.resolve as { alias?: Record<string, string> } | undefined)?.alias ?? {}
      expect(alias['#nuxe']).toBe(join(cwd, '.nuxe'))
      expect(alias['@my-ui']).toBe('/src/ui')
    } finally {
      rmSync(cwd, { recursive: true, force: true })
    }
  })

  it("works when the user doesn't provide any vite config", async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'nuxe-config-merge-'))
    try {
      writeFileSync(
        join(cwd, 'nuxe.config.ts'),
        [
          'import { defineConfig } from "@dvlkit/nuxe"',
          'export default defineConfig({})',
        ].join('\n'),
      )
      mkdirSync(join(cwd, 'app'), { recursive: true })
      writeFileSync(join(cwd, 'app', '.keep'), '')

      const config = await loadNuxeConfig({ cwd })
      const setup = await createNuxeProjectSetup(cwd, config)
      const pluginNames = (setup.baseConfig.plugins ?? []).map(
        (p) => (p as { name?: string }).name,
      )
      expect(pluginNames).toEqual(expect.arrayContaining(['vite:vue']))
    } finally {
      rmSync(cwd, { recursive: true, force: true })
    }
  })
})

const _typecheck: UserConfig = { plugins: [] }
void _typecheck
vi.fn()