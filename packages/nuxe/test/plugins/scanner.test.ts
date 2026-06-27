import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scanPlugins } from '../../lib/plugins/scanner'

describe('scanPlugins', () => {
  let cwd: string

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'nuxe-plugins-'))
    mkdirSync(join(cwd, 'app/plugins'), { recursive: true })
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  function write(name: string, content = 'export default function(){}\n') {
    writeFileSync(join(cwd, 'app/plugins', name), content)
  }

  describe('empty directory', () => {
    it('returns [] when app/plugins does not exist', () => {
      rmSync(join(cwd, 'app/plugins'), { recursive: true, force: true })
      expect(scanPlugins(cwd)).toEqual([])
    })

    it('returns [] when app/plugins is empty', () => {
      expect(scanPlugins(cwd)).toEqual([])
    })
  })

  describe('basic naming', () => {
    it('strips .ts extension', () => {
      write('analytics.ts')
      const result = scanPlugins(cwd)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('analytics')
      expect(result[0].mode).toBe('all')
    })

    it('strips .js extension', () => {
      write('analytics.js')
      const result = scanPlugins(cwd)
      expect(result[0].name).toBe('analytics')
    })

    it('ignores files starting with underscore', () => {
      write('_partial.ts')
      write('analytics.ts')
      const result = scanPlugins(cwd)
      expect(result.map(r => r.name)).toEqual(['analytics'])
    })

    it('ignores non-ts/js files', () => {
      write('README.md')
      write('analytics.ts')
      const result = scanPlugins(cwd)
      expect(result.map(r => r.name)).toEqual(['analytics'])
    })

    it('ignores index.ts', () => {
      write('index.ts')
      expect(scanPlugins(cwd)).toEqual([])
    })
  })

  describe('mode suffixes', () => {
    it('detects *.client.ts', () => {
      write('analytics.client.ts')
      const result = scanPlugins(cwd)
      expect(result[0].name).toBe('analytics')
      expect(result[0].mode).toBe('client')
    })

    it('detects *.server.ts', () => {
      write('auth.server.ts')
      const result = scanPlugins(cwd)
      expect(result[0].name).toBe('auth')
      expect(result[0].mode).toBe('server')
    })
  })

  describe('ordering', () => {
    it('sorts by numeric prefix', () => {
      write('z-last.ts')
      write('01-first.ts')
      write('10-middle.ts')
      const result = scanPlugins(cwd)
      expect(result.map(r => r.name)).toEqual(['first', 'middle', 'z-last'])
    })
  })
})
