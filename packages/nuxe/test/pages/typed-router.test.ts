import { describe, expect, it } from 'vitest'
import { generateTypedRouter } from '../../lib/pages/typed-router'
import type { ScannedPage } from '../../lib/pages/scanner'

function page(partial: Partial<ScannedPage>): ScannedPage {
  return {
    filePath: '/app/pages/index.vue',
    path: '/',
    pathTemplate: '/',
    name: 'index',
    ...partial,
  } as ScannedPage
}

describe('generateTypedRouter', () => {
  it('generates empty map when no pages exist', () => {
    const output = generateTypedRouter([])
    expect(output).toContain("import type { RouteRecordInfo } from 'vue-router'")
    expect(output).toContain('export interface RouteNamedMap {')
    expect(output).toContain('RouteNamedMap: RouteNamedMap')
    expect(output).toContain('export type RoutePaths =\n  never')
    expect(output).toContain('export type RouteNamedLocation =\n  never')
  })

  it('generates entries for static routes without params', () => {
    const output = generateTypedRouter([
      page({ filePath: '/app/pages/index.vue', path: '/', pathTemplate: '/', name: 'index' }),
      page({ filePath: '/app/pages/about.vue', path: '/about', pathTemplate: '/about', name: 'about' }),
    ])

    expect(output).toContain("'index': RouteRecordInfo<'index', '/', Record<never, never>, Record<never, never>>")
    expect(output).toContain("'about': RouteRecordInfo<'about', '/about', Record<never, never>, Record<never, never>>")
  })

  it('generates params for dynamic routes', () => {
    const output = generateTypedRouter([
      page({
        filePath: '/app/pages/users/[id].vue',
        path: '/users/:id',
        pathTemplate: '/users/[id]',
        name: 'users-id',
      }),
    ])

    expect(output).toContain("'users-id': RouteRecordInfo<'users-id', '/users/[id]', { id: ParamValue<false> }, { id: ParamValue<false> }>")
  })

  it('generates array params for catch-all routes', () => {
    const output = generateTypedRouter([
      page({
        filePath: '/app/pages/[...slug].vue',
        path: '/:slug(.*)*',
        pathTemplate: '/[...slug]',
        name: 'slug',
      }),
    ])

    expect(output).toContain("'slug': RouteRecordInfo<'slug', '/[...slug]', { slug: ParamValueZeroOrMore<false> }, { slug: ParamValueZeroOrMore<false> }>")
  })

  it('generates RoutePaths with template literals for dynamic segments', () => {
    const output = generateTypedRouter([
      page({ filePath: '/app/pages/index.vue', path: '/', pathTemplate: '/', name: 'index' }),
      page({ filePath: '/app/pages/about.vue', path: '/about', pathTemplate: '/about', name: 'about' }),
      page({
        filePath: '/app/pages/users/[id].vue',
        path: '/users/:id',
        pathTemplate: '/users/[id]',
        name: 'users-id',
      }),
      page({
        filePath: '/app/pages/[...slug].vue',
        path: '/:slug(.*)*',
        pathTemplate: '/[...slug]',
        name: 'slug',
      }),
    ])

    expect(output).toContain("export type RoutePaths =")
    expect(output).toContain('  | `/${string}`')
    expect(output).toContain('  | `/about`')
    expect(output).toContain('  | `/users/${string}`')
    expect(output).toContain('  | `/`')
  })

  it('generates RouteNamedLocation with required params', () => {
    const output = generateTypedRouter([
      page({ filePath: '/app/pages/index.vue', path: '/', pathTemplate: '/', name: 'index' }),
      page({
        filePath: '/app/pages/users/[id].vue',
        path: '/users/:id',
        pathTemplate: '/users/[id]',
        name: 'users-id',
      }),
    ])

    expect(output).toContain("export type RouteNamedLocation =")
    expect(output).toContain("  | { name: 'index' }")
    expect(output).toContain("  | { name: 'users-id'; params: { id: ParamValue<false> } }")
    expect(output).toContain("export type NuxeRouteLocationRaw = RoutePaths | RouteNamedLocation")
  })
})
