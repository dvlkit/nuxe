import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent } from 'vue'
import { createNuxeApp, createNuxeState, useRequestFetch } from '../../lib'

async function withSsrContextAsync<T>(
  ssrContext: Record<string, unknown>,
  fn: () => Promise<T> | T,
): Promise<T> {
  const app = createSSRApp(defineComponent({ render: () => null }))
  createNuxeApp({
    vueApp: app,
    router: {} as any,
    config: { public: {} },
    state: createNuxeState(),
    ssrContext,
  })
  return app.runWithContext(() => fn())
}

describe('useRequestFetch', () => {
  it('returns the global $fetch on the client (no extra wrapping)', () => {
    vi.stubGlobal('window', {})
    try {
      const fetch = useRequestFetch()
      expect(typeof fetch).toBe('function')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('falls back to the global $fetch when no SSR context is present', () => {
    const app = createSSRApp(defineComponent({ render: () => null }))
    createNuxeApp({
      vueApp: app,
      router: {} as any,
      config: { public: {} },
      state: createNuxeState(),
    })
    let result: ReturnType<typeof useRequestFetch>
    app.runWithContext(() => {
      result = useRequestFetch()
    })
    expect(typeof result).toBe('function')
  })

  it('forwards request headers to outgoing calls on the server', async () => {
    let captured: Headers | undefined
    const request = new Request('http://localhost/', {
      headers: {
        cookie: 'pgsid=abc123; session=demo',
        'x-custom': 'hello',
      },
    })
    globalThis.fetch = vi.fn(async (_input: unknown, init?: RequestInit) => {
      captured = init?.headers
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch

    await withSsrContextAsync({ request }, async () => {
      const fetch = useRequestFetch()
      await fetch('/api/listings/xyz')
    })

    expect(captured).toBeInstanceOf(Headers)
    expect(captured!.get('cookie')).toBe('pgsid=abc123; session=demo')
    expect(captured!.get('x-custom')).toBe('hello')
  })

  it('does not clobber per-call header overrides', async () => {
    let captured: Headers | undefined
    const request = new Request('http://localhost/', {
      headers: { cookie: 'old-cookie' },
    })
    globalThis.fetch = vi.fn(async (_input: unknown, init?: RequestInit) => {
      captured = init?.headers
      return new Response('{}', { status: 200 })
    }) as typeof fetch

    await withSsrContextAsync({ request }, async () => {
      const fetch = useRequestFetch()
      await fetch('/api/x', { headers: { cookie: 'override' } })
    })

    expect(captured!.get('cookie')).toBe('override')
  })

  it('handles requests with no headers gracefully', async () => {
    let captured: Headers | undefined
    const request = new Request('http://localhost/')
    globalThis.fetch = vi.fn(async (_input: unknown, init?: RequestInit) => {
      captured = init?.headers
      return new Response('{}', { status: 200 })
    }) as typeof fetch

    await withSsrContextAsync({ request }, async () => {
      const fetch = useRequestFetch()
      await fetch('/api/x')
    })

    expect(captured!.get('cookie') ?? null).toBeNull()
  })

  it('reads headers from an explicit h3 event when called from an endpoint', async () => {
    let captured: Headers | undefined
    const h3Event = {
      req: {
        headers: new Headers({
          cookie: 'pgsid=from-event',
          'x-custom': 'event-value',
        }),
        url: 'http://localhost:3000/api/listings/xyz',
      },
    }
    globalThis.fetch = vi.fn(async (_input: unknown, init?: RequestInit) => {
      captured = init?.headers
      return new Response('{}', { status: 200 })
    }) as typeof fetch

    const fetch = useRequestFetch(h3Event)
    await fetch('/v1/listings/xyz')

    expect(captured!.get('cookie')).toBe('pgsid=from-event')
    expect(captured!.get('x-custom')).toBe('event-value')
  })

  it('derives baseURL from an explicit h3 event url', async () => {
    let capturedUrl: string | undefined
    const h3Event = {
      req: {
        headers: new Headers(),
        url: 'https://api.puertogarage.cl/api/listings/xyz',
      },
    }
    globalThis.fetch = vi.fn(async (input: unknown) => {
      capturedUrl = String(input)
      return new Response('{}', { status: 200 })
    }) as typeof fetch

    const fetch = useRequestFetch(h3Event)
    await fetch('/v1/upstream')

    expect(capturedUrl).toBe('https://api.puertogarage.cl/v1/upstream')
  })

  it('does not double up baseURL when the caller passes an absolute URL', async () => {
    let capturedUrl: string | undefined
    const h3Event = {
      req: {
        headers: new Headers({ cookie: 'pgsid=abc' }),
        url: 'http://localhost:3000/api/listings/calza-deportiva-26093',
      },
    }
    globalThis.fetch = vi.fn(async (input: unknown) => {
      capturedUrl = String(input)
      return new Response('{}', { status: 200 })
    }) as typeof fetch

    const fetch = useRequestFetch(h3Event)
    await fetch('http://localhost:8080/v1/listings/calza-deportiva-26093')

    expect(capturedUrl).toBe('http://localhost:8080/v1/listings/calza-deportiva-26093')
  })
})