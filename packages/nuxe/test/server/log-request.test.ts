import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('nitro-log-request plugin', () => {
  let originalLog: typeof console.log
  let logged: string[]

  beforeEach(() => {
    originalLog = console.log
    logged = []
    console.log = (...args: unknown[]) => {
      logged.push(args.map(String).join(' '))
    }
    vi.resetModules()
  })

  afterEach(() => {
    console.log = originalLog
    vi.restoreAllMocks()
  })

  async function loadPlugin() {
    return (await import('../../lib/server/nitro-log-request')).default
  }

  function makeHooks() {
    const hooks: Record<string, ((...args: unknown[]) => void)[]> = {}
    return {
      hooks: {
        hook(name: string, fn: (...args: unknown[]) => void) {
          ;(hooks[name] ||= []).push(fn)
        },
      },
      fire(name: string, ...args: unknown[]) {
        for (const fn of hooks[name] ?? []) fn(...args)
      },
      callCount(name: string) {
        return (hooks[name] ?? []).length
      },
    }
  }

  function makeEvent(
    path = '/',
    method = 'GET',
    startedAt: number | undefined = 0,
  ) {
    const url = new URL(path, 'http://localhost')
    const event: Record<string, unknown> = {
      path,
      method,
      url,
      req: { method, url: url.href },
      context: { __nuxeStartedAt: startedAt },
    }
    return event
  }

  it('registers request, response, and error hooks', async () => {
    const nitroApp = makeHooks()
    const plugin = await loadPlugin()
    plugin(nitroApp as unknown as Parameters<typeof plugin>[0])
    expect(nitroApp.callCount('request')).toBe(1)
    expect(nitroApp.callCount('response')).toBe(1)
    expect(nitroApp.callCount('error')).toBe(1)
  })

  it('logs a successful page render with label "page"', async () => {
    const nitroApp = makeHooks()
    const plugin = await loadPlugin()
    plugin(nitroApp as unknown as Parameters<typeof plugin>[0])

    const event = makeEvent('/users/42', 'GET', 0)
    ;(event.context as { __nuxeStartedAt?: number }).__nuxeStartedAt =
      performance.now() - 25

    nitroApp.fire(
      'response',
      new Response('<html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
      event,
    )

    expect(logged).toHaveLength(1)
    const line = logged[0]!
    expect(line).toContain('GET')
    expect(line).toContain('/users/42')
    expect(line).toContain('200')
    expect(line).toMatch(/\d+ms/)
    expect(line).toContain('page')
  })

  it('classifies api routes', async () => {
    const nitroApp = makeHooks()
    const plugin = await loadPlugin()
    plugin(nitroApp as unknown as Parameters<typeof plugin>[0])

    nitroApp.fire(
      'response',
      new Response('{"ok":true}', {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
      makeEvent('/api/orders', 'POST', 0),
    )

    expect(logged).toHaveLength(1)
    expect(logged[0]).toContain('POST')
    expect(logged[0]).toContain('/api/orders')
    expect(logged[0]).toContain('201')
    expect(logged[0]).toContain('api')
  })

  it('classifies static assets', async () => {
    const nitroApp = makeHooks()
    const plugin = await loadPlugin()
    plugin(nitroApp as unknown as Parameters<typeof plugin>[0])

    nitroApp.fire(
      'response',
      new Response('js', {
        status: 200,
        headers: { 'content-type': 'application/javascript' },
      }),
      makeEvent('/_nuxt/entry.js', 'GET', 0),
    )

    expect(logged[0]).toContain('asset')
  })

  it('labels 5xx responses as "error"', async () => {
    const nitroApp = makeHooks()
    const plugin = await loadPlugin()
    plugin(nitroApp as unknown as Parameters<typeof plugin>[0])

    nitroApp.fire(
      'response',
      new Response('boom', { status: 503 }),
      makeEvent('/api/health', 'GET', 0),
    )

    expect(logged[0]).toContain('503')
    expect(logged[0]).toContain('error')
  })

  it('uppercases the HTTP method', async () => {
    const nitroApp = makeHooks()
    const plugin = await loadPlugin()
    plugin(nitroApp as unknown as Parameters<typeof plugin>[0])

    nitroApp.fire(
      'response',
      new Response('', { status: 200 }),
      makeEvent('/api/foo', 'patch', 0),
    )

    expect(logged[0]).toContain('PATCH')
  })

  it('preserves the query string in the URL', async () => {
    const nitroApp = makeHooks()
    const plugin = await loadPlugin()
    plugin(nitroApp as unknown as Parameters<typeof plugin>[0])

    nitroApp.fire(
      'response',
      new Response('<html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
      makeEvent('/search?q=hello&page=2', 'GET', 0),
    )

    expect(logged[0]).toContain('/search?q=hello&page=2')
  })

  it('skips logging when request hook did not record a start time', async () => {
    const nitroApp = makeHooks()
    const plugin = await loadPlugin()
    plugin(nitroApp as unknown as Parameters<typeof plugin>[0])

    nitroApp.fire(
      'response',
      new Response('', { status: 200 }),
      makeEvent('/x', 'GET', undefined),
    )

    expect(logged).toHaveLength(0)
  })

  it('logs from the error hook with method/path/500', async () => {
    const nitroApp = makeHooks()
    const plugin = await loadPlugin()
    plugin(nitroApp as unknown as Parameters<typeof plugin>[0])

    nitroApp.fire('error', new Error('boom'), {
      event: makeEvent('/orders', 'POST', 0),
    })

    expect(logged).toHaveLength(1)
    expect(logged[0]).toContain('POST')
    expect(logged[0]).toContain('/orders')
    expect(logged[0]).toContain('500')
    expect(logged[0]).toContain('error')
    expect(logged[0]).toContain('boom')
  })

  it('skips error logging when there is no event', async () => {
    const nitroApp = makeHooks()
    const plugin = await loadPlugin()
    plugin(nitroApp as unknown as Parameters<typeof plugin>[0])

    nitroApp.fire('error', new Error('orphan'), { event: undefined })
    expect(logged).toHaveLength(0)
  })
})
