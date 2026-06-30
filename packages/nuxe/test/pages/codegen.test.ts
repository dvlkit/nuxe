import { describe, expect, it } from 'vitest'
import { generateRoutesModule, ROUTES_HMR_CODE } from '../../lib/pages/codegen'
import type { ScannedPage } from '../../lib/pages/scanner'

describe('generateRoutesModule', () => {
  it('generates an empty array when there are no pages', () => {
    const code = generateRoutesModule([])
    expect(code).toContain(ROUTES_HMR_CODE)
    expect(code).toContain('export default []')
    expect(code).not.toContain('export const routes')
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
    expect(code).toContain('export default [')
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

describe('ROUTES_HMR_CODE', () => {
  it('declares handleHotUpdate as an exported function', () => {
    expect(ROUTES_HMR_CODE).toContain('export function handleHotUpdate(router)')
  })

  it('uses import.meta.hot.accept for HMR replacement', () => {
    expect(ROUTES_HMR_CODE).toContain('import.meta.hot.accept')
    expect(ROUTES_HMR_CODE).toContain('router.clearRoutes()')
    expect(ROUTES_HMR_CODE).toContain('router.addRoute(route)')
  })
})
