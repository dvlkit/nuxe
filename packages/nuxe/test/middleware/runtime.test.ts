import { describe, expect, it } from 'vitest'
import {
  defineNuxeRouteMiddleware,
  navigateTo,
  abortNavigation,
  type RouteMiddleware,
} from '../../lib'

describe('defineNuxeRouteMiddleware', () => {
  it('returns the same function reference (identity)', () => {
    const fn: RouteMiddleware = () => undefined
    expect(defineNuxeRouteMiddleware(fn)).toBe(fn)
  })

  it('preserves the function behavior', () => {
    const fn = defineNuxeRouteMiddleware(() => 'redirect-to' as any)
    expect(fn({} as any, {} as any)).toBe('redirect-to')
  })
})

describe('navigateTo', () => {
  describe('nullish input', () => {
    it('returns undefined for undefined', () => {
      expect(navigateTo(undefined)).toBeUndefined()
    })

    it('returns undefined for null', () => {
      expect(navigateTo(null)).toBeUndefined()
    })
  })

  describe('string input', () => {
    it('converts string to { path } object', () => {
      const result = navigateTo('/login') as any
      expect(result).toEqual({ path: '/login' })
    })

    it('returns the object directly', () => {
      const result = navigateTo('/dashboard')
      expect(result).toEqual({ path: '/dashboard' })
    })
  })

  describe('object input', () => {
    it('returns the object as-is when no options', () => {
      const target = { name: 'home' }
      expect(navigateTo(target)).toBe(target)
    })

    it('returns the object with full path/query preserved', () => {
      const target = { path: '/users', query: { id: '5' } }
      expect(navigateTo(target)).toEqual({ path: '/users', query: { id: '5' } })
    })
  })

  describe('replace option', () => {
    it('adds replace: true to string target', () => {
      const result = navigateTo('/login', { replace: true }) as any
      expect(result).toEqual({ path: '/login', replace: true })
    })

    it('adds replace: true to object target (no mutation)', () => {
      const target = { path: '/dashboard', query: { foo: 'bar' } }
      const result = navigateTo(target, { replace: true }) as any
      expect(result).toMatchObject({ path: '/dashboard', query: { foo: 'bar' }, replace: true })
      expect(target).not.toHaveProperty('replace')
    })
  })

  describe('external option', () => {
    afterEachRestoreWindow()

    it('returns target on server side', () => {
      delete (globalThis as any).window
      const result = navigateTo('https://example.com', { external: true }) as any
      expect(result).toEqual({ path: 'https://example.com' })
    })

    it('returns false on client side and assigns window.location.href', () => {
      ;(globalThis as any).window = { location: { href: '' } }
      const result = navigateTo('https://example.com', { external: true })
      expect(result).toBe(false)
      expect((globalThis as any).window.location.href).toBe('https://example.com')
    })
  })

  function afterEachRestoreWindow() {
  }
})

describe('abortNavigation', () => {
  it('returns false', () => {
    expect(abortNavigation()).toBe(false)
  })

  it('attaches payload from Error object', () => {
    abortNavigation(new Error('Unauthorized'))
    expect((abortNavigation as any).__lastPayload).toEqual({ statusMessage: 'Unauthorized' })
  })

  it('attaches payload from string', () => {
    abortNavigation('Forbidden')
    expect((abortNavigation as any).__lastPayload).toEqual({ statusMessage: 'Forbidden' })
  })

  it('attaches payload from options object', () => {
    abortNavigation({ statusCode: 403, statusMessage: 'Forbidden' })
    expect((abortNavigation as any).__lastPayload).toEqual({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  })

  it('overwrites previous payload on subsequent calls', () => {
    abortNavigation('first')
    abortNavigation('second')
    expect((abortNavigation as any).__lastPayload).toEqual({ statusMessage: 'second' })
  })
})
