import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent } from 'vue'
import { createNuxeApp, createNuxeState, useRequestEvent, useRequestHeaders, useRequestURL } from '../../lib'

describe('useRequestEvent', () => {
  it('returns the raw request from ssrContext', () => {
    const request = new Request('http://localhost/test', {
      headers: { 'x-custom': 'hello' },
    })
    const app = createSSRApp(defineComponent({ render: () => null }))
    createNuxeApp({
      vueApp: app,
      router: {} as any,
      config: { public: {} },
      state: createNuxeState(),
      ssrContext: { request },
    })

    let event: ReturnType<typeof useRequestEvent>
    app.runWithContext(() => {
      event = useRequestEvent()
    })

    expect(event).toBe(request)
  })

  it('returns undefined on client (no ssrContext)', () => {
    const app = createSSRApp(defineComponent({ render: () => null }))
    createNuxeApp({
      vueApp: app,
      router: {} as any,
      config: { public: {} },
      state: createNuxeState(),
    })

    let event: ReturnType<typeof useRequestEvent>
    app.runWithContext(() => {
      event = useRequestEvent()
    })

    expect(event).toBeUndefined()
  })
})

describe('useRequestHeaders', () => {
  it('returns request headers as a plain object', () => {
    const request = new Request('http://localhost/test', {
      headers: {
        'x-custom': 'hello',
        accept: 'application/json',
      },
    })
    const app = createSSRApp(defineComponent({ render: () => null }))
    createNuxeApp({
      vueApp: app,
      router: {} as any,
      config: { public: {} },
      state: createNuxeState(),
      ssrContext: { request },
    })

    let headers: ReturnType<typeof useRequestHeaders>
    app.runWithContext(() => {
      headers = useRequestHeaders()
    })

    expect(headers!['x-custom']).toBe('hello')
    expect(headers!.accept).toBe('application/json')
  })

  it('returns empty object on client', () => {
    const app = createSSRApp(defineComponent({ render: () => null }))
    createNuxeApp({
      vueApp: app,
      router: {} as any,
      config: { public: {} },
      state: createNuxeState(),
    })

    let headers: ReturnType<typeof useRequestHeaders>
    app.runWithContext(() => {
      headers = useRequestHeaders()
    })

    expect(headers).toEqual({})
  })
})

describe('client-side early-return (no Vue context warning)', () => {
  it('useRequestEvent returns undefined on the client without calling useNuxeApp', () => {
    vi.stubGlobal('window', {})
    try {
      expect(useRequestEvent()).toBeUndefined()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('useRequestHeaders returns {} on the client without calling useNuxeApp', () => {
    vi.stubGlobal('window', {})
    try {
      expect(useRequestHeaders()).toEqual({})
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('useRequestURL', () => {
  type FakeRequest = { url: string; headers: Headers }

  function makeRequest(path: string, headerEntries: Record<string, string> = {}): FakeRequest {
    return {
      url: path,
      headers: new Headers(headerEntries),
    }
  }

  function withSsrContext<T>(ssrContext: Record<string, unknown>, fn: () => T): T {
    const app = createSSRApp(defineComponent({ render: () => null }))
    createNuxeApp({
      vueApp: app,
      router: {} as any,
      config: { public: {} },
      state: createNuxeState(),
      ssrContext,
    })
    let result!: T
    app.runWithContext(() => {
      result = fn()
    })
    return result
  }

  it('returns the URL when request.url already carries an origin', () => {
    const request = makeRequest('https://example.com/productos/foo?bar=1')
    const url = withSsrContext({ request }, () => useRequestURL())
    expect(url.pathname).toBe('/productos/foo')
    expect(url.host).toBe('example.com')
    expect(url.protocol).toBe('https:')
    expect(url.searchParams.get('bar')).toBe('1')
  })

  it('builds an absolute URL from host header when request.url is relative', () => {
    const request = makeRequest('/productos/x', { host: 'mi-sitio.test' })
    const url = withSsrContext({ request }, () => useRequestURL())
    expect(url.href).toBe('http://mi-sitio.test/productos/x')
  })

  it('respects x-forwarded-host when present', () => {
    const request = makeRequest('/x', {
      host: 'internal.local',
      'x-forwarded-host': 'public.example.com',
    })
    const url = withSsrContext({ request }, () => useRequestURL())
    expect(url.host).toBe('public.example.com')
  })

  it('respects x-forwarded-proto when present', () => {
    const request = makeRequest('/x', {
      host: 'example.com',
      'x-forwarded-proto': 'https',
    })
    const url = withSsrContext({ request }, () => useRequestURL())
    expect(url.protocol).toBe('https:')
  })

  it('opts.xForwardedHost=false disables x-forwarded-host lookup', () => {
    const request = makeRequest('/x', {
      host: 'real.test',
      'x-forwarded-host': 'spoofed.test',
    })
    const url = withSsrContext({ request }, () =>
      useRequestURL({ xForwardedHost: false }),
    )
    expect(url.host).toBe('real.test')
  })

  it('falls back to localhost when no host headers are present', () => {
    const request = makeRequest('/x')
    const url = withSsrContext({ request }, () => useRequestURL())
    expect(url.host).toBe('localhost')
  })

  it('returns globalThis.location.href on the client', () => {
    vi.stubGlobal('location', { href: 'http://browser.test/ruta' })
    vi.stubGlobal('window', {})
    try {
      const url = useRequestURL()
      expect(url.href).toBe('http://browser.test/ruta')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('falls back to ssrContext.url when ssrContext.request is missing', () => {
    const url = withSsrContext(
      { url: '/productos/fallback' },
      () => useRequestURL(),
    )
    expect(url.pathname).toBe('/productos/fallback')
    expect(url.host).toBe('localhost')
  })

  it('falls back to / when neither request nor url is present', () => {
    const url = withSsrContext({}, () => useRequestURL())
    expect(url.pathname).toBe('/')
  })
})
