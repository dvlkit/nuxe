import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPagesContext } from '../../lib/pages/context'

function createFixture(): string {
  return mkdtempSync(join(tmpdir(), 'nuxe-pages-ctx-'))
}

function writePage(cwd: string, relativePath: string, content = '<script setup></script>'): string {
  const fullPath = join(cwd, relativePath)
  mkdirSync(fullPath.split('/').slice(0, -1).join('/'), { recursive: true })
  writeFileSync(fullPath, content)
  return fullPath
}

describe('createPagesContext', () => {
  let cwd: string

  beforeEach(() => {
    cwd = createFixture()
  })

  afterEach(() => {
    if (existsSync(cwd)) rmSync(cwd, { recursive: true, force: true })
  })

  it('initializes from a full disk scan', () => {
    writePage(cwd, 'app/pages/index.vue')
    writePage(cwd, 'app/pages/about.vue')

    const ctx = createPagesContext({ cwd })

    const pages = ctx.emit()
    expect(pages).toHaveLength(2)
    expect(pages.find((p) => p.path === '/')).toBeDefined()
    expect(pages.find((p) => p.path === '/about')).toBeDefined()
  })

  it('addFile registers a new page without full rescan', () => {
    writePage(cwd, 'app/pages/index.vue')
    const ctx = createPagesContext({ cwd })

    expect(ctx.emit()).toHaveLength(1)

    const newPath = writePage(cwd, 'app/pages/users/[id].vue')
    ctx.addFile(newPath)

    const pages = ctx.emit()
    expect(pages).toHaveLength(2)
    expect(pages.find((p) => p.path === '/users/:id')).toBeDefined()
  })

  it('removeFile removes an existing entry', () => {
    writePage(cwd, 'app/pages/index.vue')
    writePage(cwd, 'app/pages/about.vue')
    const ctx = createPagesContext({ cwd })

    expect(ctx.emit()).toHaveLength(2)

    const removed = ctx.removeFile(join(cwd, 'app/pages/about.vue'))
    expect(removed).toBe(true)

    const pages = ctx.emit()
    expect(pages).toHaveLength(1)
    expect(pages.find((p) => p.path === '/about')).toBeUndefined()
  })

  it('removeFile returns false for unknown paths', () => {
    writePage(cwd, 'app/pages/index.vue')
    const ctx = createPagesContext({ cwd })

    expect(ctx.removeFile(join(cwd, 'app/pages/nope.vue'))).toBe(false)
    expect(ctx.emit()).toHaveLength(1)
  })

  it('addFile is a no-op for files outside app/pages/', () => {
    writePage(cwd, 'app/pages/index.vue')
    writePage(cwd, 'app/components/button.vue')
    const ctx = createPagesContext({ cwd })

    ctx.addFile(join(cwd, 'app/components/button.vue'))

    expect(ctx.emit()).toHaveLength(1)
    expect(ctx.emit()[0].path).toBe('/')
  })

  it('addFile is a no-op for underscore-prefixed files', () => {
    writePage(cwd, 'app/pages/index.vue')
    writePage(cwd, 'app/pages/_partial.vue')
    const ctx = createPagesContext({ cwd })

    expect(ctx.emit()).toHaveLength(1)

    ctx.addFile(join(cwd, 'app/pages/_partial.vue'))
    expect(ctx.emit()).toHaveLength(1)
  })

  it('emits pages in stable order (path then name)', () => {
    writePage(cwd, 'app/pages/zebra.vue')
    writePage(cwd, 'app/pages/apple.vue')
    writePage(cwd, 'app/pages/mango.vue')
    const ctx = createPagesContext({ cwd })

    const paths = ctx.emit().map((p) => p.path)
    expect(paths).toEqual(['/apple', '/mango', '/zebra'])
  })

  it('trackedFiles exposes the current set', () => {
    const indexPath = writePage(cwd, 'app/pages/index.vue')
    const ctx = createPagesContext({ cwd })

    expect(ctx.trackedFiles.has(indexPath)).toBe(true)
    expect(ctx.trackedFiles.size).toBe(1)

    const newPath = writePage(cwd, 'app/pages/extra.vue')
    ctx.addFile(newPath)
    expect(ctx.trackedFiles.has(newPath)).toBe(true)
    expect(ctx.trackedFiles.size).toBe(2)

    ctx.removeFile(indexPath)
    expect(ctx.trackedFiles.has(indexPath)).toBe(false)
    expect(ctx.trackedFiles.size).toBe(1)
  })

  it('accepts a custom pagesDir', () => {
    writePage(cwd, 'src/routes/index.vue')
    writePage(cwd, 'app/pages/index.vue')

    const ctx = createPagesContext({ cwd, pagesDir: 'src/routes' })

    const pages = ctx.emit()
    expect(pages).toHaveLength(1)
    expect(pages[0].path).toBe('/')
    expect(pages[0].filePath).toContain('src/routes/index.vue')
  })

  it('addFile with relative path resolves against cwd', () => {
    writePage(cwd, 'app/pages/index.vue')
    const ctx = createPagesContext({ cwd })

    writePage(cwd, 'app/pages/new.vue')
    ctx.addFile('app/pages/new.vue')

    expect(ctx.emit()).toHaveLength(2)
  })
})