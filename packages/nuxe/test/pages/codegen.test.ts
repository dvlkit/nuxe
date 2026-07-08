import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { generateRoutesModule, ROUTES_HMR_CODE } from '../../lib/pages/codegen'
import type { ScannedPage } from '../../lib/pages/scanner'

describe('generateRoutesModule', () => {
  it('generates an empty array when there are no pages', () => {
    const code = generateRoutesModule([], '/unused')
    expect(code).toContain(ROUTES_HMR_CODE)
    expect(code).toContain('export default []')
    expect(code).not.toContain('export const routes')
  })

  it('generates routes with dynamic imports and meta', () => {
    const pagesRoot = join(sep === '/' ? '/project' : 'C:\\project', 'app', 'pages')
    const pages: ScannedPage[] = [
      {
        filePath: join(pagesRoot, 'index.vue'),
        path: '/',
        name: 'index',
        meta: { layout: 'default' },
      },
      {
        filePath: join(pagesRoot, 'users', '[id].vue'),
        path: '/users/:id',
        name: 'users-id',
      },
    ]

    const code = generateRoutesModule(pages, pagesRoot)
    expect(code).toContain("component: () => import('/app/pages/index.vue')")
    expect(code).toContain("component: () => import('/app/pages/users/[id].vue')")
    expect(code).toContain('meta: {"layout":"default"}')
    expect(code).toContain('meta: {}')
    expect(code).toContain('export default [')
  })

  it('includes routeRules inside meta', () => {
    const pagesRoot = join(sep === '/' ? '/project' : 'C:\\project', 'app', 'pages')
    const pages: ScannedPage[] = [
      {
        filePath: join(pagesRoot, 'spa.vue'),
        path: '/spa',
        name: 'spa',
        routeRules: { ssr: false },
      },
    ]

    const code = generateRoutesModule(pages, pagesRoot)
    expect(code).toContain('meta: {"routeRules":{"ssr":false}}')
  })

  it('handles Windows-style absolute paths', () => {
    const pagesRoot = join('C:\\Users\\dev\\proj', 'app', 'pages')
    const pages: ScannedPage[] = [
      {
        filePath: join(pagesRoot, 'productos', '[productId].vue'),
        path: '/productos/:productId',
        name: 'productos-productId',
      },
    ]

    const code = generateRoutesModule(pages, pagesRoot)
    expect(code).toContain("component: () => import('/app/pages/productos/[productId].vue')")
    expect(code).not.toContain('C:')
    expect(code).not.toContain('\\app\\pages')
  })

  it('throws when a page filePath is not under pagesRoot', () => {
    const pagesRoot = join('/project', 'app', 'pages')
    const pages: ScannedPage[] = [
      {
        filePath: '/other-project/app/pages/index.vue',
        path: '/',
        name: 'index',
      },
    ]

    expect(() => generateRoutesModule(pages, pagesRoot)).toThrow(/not under app\/pages/)
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
