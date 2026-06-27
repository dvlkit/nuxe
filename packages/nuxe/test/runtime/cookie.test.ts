import { describe, expect, it } from 'vitest'
import { createSSRApp, defineComponent } from 'vue'
import { createNuxtApp } from '../../lib/plugins/runtime'
import { createNuxtState } from '../../lib/runtime/state'
import { parseCookieValue, serializeCookie, useCookie } from '../../lib/runtime/cookie'

function createMockRequest(cookieHeader: string): Request {
  return new Request('http://localhost/', { headers: { cookie: cookieHeader } })
}

describe('cookie helpers', () => {
  it('parses a cookie value', () => {
    expect(parseCookieValue('token=abc123; other=xyz', 'token')).toBe('abc123')
    expect(parseCookieValue('token=abc123; other=xyz', 'missing')).toBeUndefined()
  })

  it('serializes cookie options', () => {
    const serialized = serializeCookie('token', 'abc', {
      path: '/',
      maxAge: 3600,
      secure: true,
      sameSite: 'lax',
    })
    expect(serialized).toContain('token=abc')
    expect(serialized).toContain('Path=/')
    expect(serialized).toContain('Max-Age=3600')
    expect(serialized).toContain('Secure')
    expect(serialized).toContain('SameSite=lax')
  })
})

describe('useCookie server', () => {
  it('reads initial value from request cookie header', () => {
    const app = createSSRApp(defineComponent({ render: () => null }))
    createNuxtApp({
      vueApp: app,
      router: {} as any,
      config: { public: {} },
      state: createNuxtState(),
      ssrContext: {
        request: createMockRequest('session=hello'),
      },
    })

    let cookie = null as ReturnType<typeof useCookie> | null
    app.runWithContext(() => {
      cookie = useCookie('session')
    })

    expect(cookie!.value).toBe('hello')
  })
})
