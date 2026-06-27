import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scanPages } from '../../lib/pages/scanner'

function createFixture(structure: Record<string, string>): string {
  const cwd = mkdtempSync(join(tmpdir(), 'nuxe-pages-'))
  for (const [relativePath, content] of Object.entries(structure)) {
    const fullPath = join(cwd, relativePath)
    mkdirSync(fullPath.split('/').slice(0, -1).join('/'), { recursive: true })
    writeFileSync(fullPath, content)
  }
  return cwd
}

describe('scanPages', () => {
  it('scans index and basic pages', () => {
    const cwd = createFixture({
      'app/pages/index.vue': '<script setup></script>',
      'app/pages/about.vue': '<script setup></script>',
    })

    const pages = scanPages(cwd)
    expect(pages).toHaveLength(2)
    expect(pages.find((p) => p.path === '/')).toBeDefined()
    expect(pages.find((p) => p.path === '/about')).toBeDefined()
  })

  it('scans dynamic [id].vue routes', () => {
    const cwd = createFixture({
      'app/pages/users/[id].vue': '<script setup></script>',
    })

    const pages = scanPages(cwd)
    expect(pages).toHaveLength(1)
    expect(pages[0]).toMatchObject({
      path: '/users/:id',
      name: 'users-id',
    })
  })

  it('scans catch-all [...slug].vue routes', () => {
    const cwd = createFixture({
      'app/pages/[...slug].vue': '<script setup></script>',
    })

    const pages = scanPages(cwd)
    expect(pages).toHaveLength(1)
    expect(pages[0]).toMatchObject({
      path: '/:slug(.*)*',
      name: 'slug',
    })
  })

  it('ignores files and folders starting with underscore', () => {
    const cwd = createFixture({
      'app/pages/index.vue': '<script setup></script>',
      'app/pages/_ignored.vue': '<script setup></script>',
      'app/pages/_partial/thing.vue': '<script setup></script>',
    })

    const pages = scanPages(cwd)
    expect(pages).toHaveLength(1)
    expect(pages[0].path).toBe('/')
  })

  it('handles route groups without affecting path', () => {
    const cwd = createFixture({
      'app/pages/(marketing)/about.vue': '<script setup></script>',
      'app/pages/(shop)/products.vue': '<script setup></script>',
    })

    const pages = scanPages(cwd)
    expect(pages).toHaveLength(2)
    expect(pages.find((p) => p.path === '/about')).toBeDefined()
    expect(pages.find((p) => p.path === '/products')).toBeDefined()
  })

  it('extracts meta from definePage', () => {
    const cwd = createFixture({
      'app/pages/admin.vue': `<script setup>
definePage({ meta: { layout: 'admin', middleware: 'auth' } })
</script>`,
    })

    const pages = scanPages(cwd)
    expect(pages).toHaveLength(1)
    expect(pages[0].meta).toEqual({ layout: 'admin', middleware: 'auth' })
  })
})
