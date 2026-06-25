import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scanMiddlewares } from '../../lib/middleware/scanner.ts'

describe('scanMiddlewares', () => {
  let cwd: string

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'nuxe-scanner-'))
    mkdirSync(join(cwd, 'app/middleware'), { recursive: true })
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  function write(name: string, content = 'export default function(){}\n') {
    writeFileSync(join(cwd, 'app/middleware', name), content)
  }

  describe('empty directory', () => {
    it('returns [] when app/middleware does not exist', () => {
      rmSync(join(cwd, 'app/middleware'), { recursive: true, force: true })
      expect(scanMiddlewares(cwd)).toEqual([])
    })

    it('returns [] when app/middleware is empty', () => {
      expect(scanMiddlewares(cwd)).toEqual([])
    })
  })

  describe('basic naming', () => {
    it('strips .ts extension', () => {
      write('admin.ts')
      const result = scanMiddlewares(cwd)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('admin')
      expect(result[0].global).toBe(false)
      expect(result[0].serverOnly).toBe(false)
    })

    it('strips .js extension', () => {
      write('admin.js')
      const result = scanMiddlewares(cwd)
      expect(result[0].name).toBe('admin')
    })

    it('ignores files starting with underscore', () => {
      write('_partial.ts')
      write('admin.ts')
      const result = scanMiddlewares(cwd)
      expect(result.map(r => r.name)).toEqual(['admin'])
    })

    it('ignores non-ts/js files', () => {
      write('README.md')
      write('admin.ts')
      write('notes.txt')
      const result = scanMiddlewares(cwd)
      expect(result.map(r => r.name)).toEqual(['admin'])
    })

    it('ignores index.ts (no resolvable name)', () => {
      write('index.ts')
      expect(scanMiddlewares(cwd)).toEqual([])
    })
  })

  describe('global suffix', () => {
    it('detects *.global.ts', () => {
      write('auth.global.ts')
      const result = scanMiddlewares(cwd)
      expect(result[0].name).toBe('auth')
      expect(result[0].global).toBe(true)
      expect(result[0].serverOnly).toBe(false)
    })

    it('detects *.global.js', () => {
      write('auth.global.js')
      const result = scanMiddlewares(cwd)
      expect(result[0].global).toBe(true)
    })
  })

  describe('server-only suffix', () => {
    it('detects *.server.ts', () => {
      write('admin.server.ts')
      const result = scanMiddlewares(cwd)
      expect(result[0].name).toBe('admin')
      expect(result[0].global).toBe(false)
      expect(result[0].serverOnly).toBe(true)
    })

    it('detects *.server.js', () => {
      write('admin.server.js')
      const result = scanMiddlewares(cwd)
      expect(result[0].serverOnly).toBe(true)
    })

    it('detects *.server.global.ts as server-only + global', () => {
      write('auth.server.global.ts')
      const result = scanMiddlewares(cwd)
      expect(result[0].name).toBe('auth')
      expect(result[0].global).toBe(true)
      expect(result[0].serverOnly).toBe(true)
    })

    it('detects *.global.server.ts as server-only + global (any order)', () => {
      write('auth.global.server.ts')
      const result = scanMiddlewares(cwd)
      expect(result[0].name).toBe('auth')
      expect(result[0].global).toBe(true)
      expect(result[0].serverOnly).toBe(true)
    })
  })

  describe('mixed files', () => {
    it('returns all middleware with correct flags', () => {
      write('auth.global.ts')
      write('admin.ts')
      write('premium.server.ts')
      write('audit.server.global.ts')

      const result = scanMiddlewares(cwd)
      const map = Object.fromEntries(result.map(r => [r.name, r]))

      expect(map.auth).toMatchObject({ global: true, serverOnly: false })
      expect(map.admin).toMatchObject({ global: false, serverOnly: false })
      expect(map.premium).toMatchObject({ global: false, serverOnly: true })
      expect(map.audit).toMatchObject({ global: true, serverOnly: true })
    })

    it('preserves absolute paths', () => {
      write('admin.ts')
      const result = scanMiddlewares(cwd)
      expect(result[0].path).toBe(join(cwd, 'app/middleware/admin.ts'))
    })
  })
})
