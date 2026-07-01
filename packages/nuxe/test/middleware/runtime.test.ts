import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  defineNuxeRouteMiddleware,
  navigateTo,
  abortNavigation,
  type RouteMiddleware,
} from '../../lib'

const NAVIGATE_TO_MARKER = Symbol.for('@dvlkit/nuxe/navigate-to')
const ABORT_NAVIGATION_MARKER = Symbol.for('@dvlkit/nuxe/abort-navigation')

describe('defineNuxeRouteMiddleware', () => {
  it('returns the same function reference (identity)', () => {
    const fn: RouteMiddleware = () => undefined
    expect(defineNuxeRouteMiddleware(fn)).toBe(fn)
  })

  it('preserves the function behavior', () => {
    const fn = defineNuxeRouteMiddleware(() => 'redirect-to' as any)
    expect(fn({} as any, {} as any)).toBe('redirect-to')
  })

  it('accepts async middleware', async () => {
    const fn = defineNuxeRouteMiddleware(async () => 'redirect-to' as any)
    await expect(fn({} as any, {} as any)).resolves.toBe('redirect-to')
  })

  it('accepts async middleware that resolves to undefined', async () => {
    const fn = defineNuxeRouteMiddleware(async () => undefined)
    await expect(fn({} as any, {} as any)).resolves.toBeUndefined()
  })

  it('preserves async identity', () => {
    const inner = async () => undefined as any
    const wrapped = defineNuxeRouteMiddleware(inner)
    expect(wrapped).toBe(inner)
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

  describe('server-side (window undefined)', () => {
    it('returns marker for string target', () => {
      delete (globalThis as any).window
      const result = navigateTo('/login') as any
      expect(result[NAVIGATE_TO_MARKER]).toBe(true)
      expect(result.to).toEqual({ path: '/login' })
      expect(result.redirectCode).toBe(302)
      expect(result.external).toBe(false)
    })

    it('returns marker for object target', () => {
      delete (globalThis as any).window
      const target = { name: 'home' }
      const result = navigateTo(target) as any
      expect(result[NAVIGATE_TO_MARKER]).toBe(true)
      expect(result.to).toBe(target)
    })

    it('returns marker for external redirect', () => {
      delete (globalThis as any).window
      const result = navigateTo('https://example.com', { external: true }) as any
      expect(result[NAVIGATE_TO_MARKER]).toBe(true)
      expect(result.to).toBe('https://example.com')
      expect(result.external).toBe(true)
    })

    it('uses custom redirectCode', () => {
      delete (globalThis as any).window
      const result = navigateTo('/moved', { redirectCode: 301 }) as any
      expect(result.redirectCode).toBe(301)
    })
  })

  describe('client-side (window defined)', () => {
    beforeEach(() => {
      ;(globalThis as any).window = { location: { href: '' } }
    })

    afterEach(() => {
      delete (globalThis as any).window
    })

    it('converts string to { path } object', () => {
      const result = navigateTo('/login') as any
      expect(result).toEqual({ path: '/login' })
    })

    it('returns the object directly', () => {
      const result = navigateTo('/dashboard')
      expect(result).toEqual({ path: '/dashboard' })
    })

    it('returns object as-is when no options', () => {
      const target = { name: 'home' }
      expect(navigateTo(target)).toBe(target)
    })

    it('adds replace: true', () => {
      const result = navigateTo('/login', { replace: true }) as any
      expect(result).toEqual({ path: '/login', replace: true })
    })

    it('navigates external via window.location', () => {
      const result = navigateTo('https://example.com', { external: true })
      expect(result).toBe(false)
      expect((globalThis as any).window.location.href).toBe('https://example.com')
    })
  })
})

describe('abortNavigation', () => {
  describe('server-side (window undefined)', () => {
    beforeEach(() => {
      delete (globalThis as any).window
    })

    it('returns marker', () => {
      const result = abortNavigation() as any
      expect(result[ABORT_NAVIGATION_MARKER]).toBe(true)
    })

    it('attaches payload from Error object', () => {
      const result = abortNavigation(new Error('Unauthorized')) as any
      expect(result[ABORT_NAVIGATION_MARKER]).toBe(true)
      expect(result.statusMessage).toBe('Unauthorized')
    })

    it('attaches payload from string', () => {
      const result = abortNavigation('Forbidden') as any
      expect(result[ABORT_NAVIGATION_MARKER]).toBe(true)
      expect(result.statusMessage).toBe('Forbidden')
    })

    it('attaches payload from options object', () => {
      const result = abortNavigation({ statusCode: 403, statusMessage: 'Forbidden' }) as any
      expect(result[ABORT_NAVIGATION_MARKER]).toBe(true)
      expect(result.statusCode).toBe(403)
      expect(result.statusMessage).toBe('Forbidden')
    })
  })

  describe('client-side (window defined)', () => {
    beforeEach(() => {
      ;(globalThis as any).window = {}
    })

    afterEach(() => {
      delete (globalThis as any).window
    })

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
})
