import { describe, expect, it } from 'vitest'
import { generateRoutesModule } from '../../lib/pages/codegen'
import type { ScannedPage } from '../../lib/pages/scanner'

describe('generateRoutesModule', () => {
  it('generates an empty array when there are no pages', () => {
    expect(generateRoutesModule([])).toBe('export const routes = []\n')
  })

  it('generates routes with dynamic imports and meta', () => {
    const pages: ScannedPage[] = [
      {
        filePath: '/project/app/pages/index.vue',
        path: '/',
        name: 'index',
        meta: { layout: 'default' },
      },
      {
        filePath: '/project/app/pages/users/[id].vue',
        path: '/users/:id',
        name: 'users-id',
      },
    ]

    const code = generateRoutesModule(pages)
    expect(code).toContain("component: () => import('/app/pages/index.vue')")
    expect(code).toContain("component: () => import('/app/pages/users/[id].vue')")
    expect(code).toContain('meta: {"layout":"default"}')
    expect(code).toContain('meta: {}')
  })

  it('includes routeRules inside meta', () => {
    const pages: ScannedPage[] = [
      {
        filePath: '/project/app/pages/spa.vue',
        path: '/spa',
        name: 'spa',
        routeRules: { ssr: false },
      },
    ]

    const code = generateRoutesModule(pages)
    expect(code).toContain('meta: {"routeRules":{"ssr":false}}')
  })
})
