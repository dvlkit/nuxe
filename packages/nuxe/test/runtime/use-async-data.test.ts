import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, effectScope, nextTick, ref, type Ref } from 'vue'
import { createNuxeApp, createNuxeState } from '../../lib'
import type { NuxeSSRContext } from '../../lib/types/ssr-context'
import {
  setHydratedPayload,
  useAsyncData,
} from '../../lib'

function setupServerContext() {
  const app = createSSRApp(defineComponent({ render: () => null }))
  const ssrContext: NuxeSSRContext = {
    url: '/',
    request: new Request('http://localhost/'),
    modules: new Set<string>(),
    payload: {},
    pending: new Map(),
    async awaitAll() {
      if (this.pending.size === 0) return
      await Promise.allSettled(this.pending.values())
    },
  }
  const nuxeApp = createNuxeApp({
    vueApp: app,
    router: {} as any,
    config: { public: {} },
    ssrContext,
    state: createNuxeState(),
  })
  ;(globalThis as { __NUXE_SSR_CONTEXT__?: NuxeSSRContext }).__NUXE_SSR_CONTEXT__ = ssrContext
  return { app, ctx: ssrContext, nuxeApp }
}

afterEach(() => {
  delete (globalThis as { __NUXE_SSR_CONTEXT__?: NuxeSSRContext }).__NUXE_SSR_CONTEXT__
})

describe('useAsyncData (server)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws when key is missing', () => {
    expect(() => useAsyncData('', async () => 1)).toThrow(
      '[nuxe] useAsyncData: `key` is required',
    )
  })

  it('runs the handler and writes the result into the request context payload', async () => {
    const { ctx, app } = setupServerContext()
    const handler = vi.fn().mockResolvedValue({ hello: 'world' })

    await app.runWithContext(async () => {
      const { data, status, error } = useAsyncData<{ hello: string }>('greeting', handler)
      await ctx.awaitAll()
      await nextTick()

      expect(handler).toHaveBeenCalledTimes(1)
      expect(data.value).toEqual({ hello: 'world' })
      expect(status.value).toBe('success')
      expect(error.value).toBeNull()
      expect(ctx.payload.greeting).toEqual({ hello: 'world' })
    })
  })

  it('writes __error to payload on failure and exposes the error on the return', async () => {
    const { ctx, app } = setupServerContext()
    const failure = new Error('boom')

    await app.runWithContext(async () => {
      const { data, status, error } = useAsyncData('oops', () => Promise.reject(failure))
      await ctx.awaitAll()
      await nextTick()

      expect(data.value).toBeNull()
      expect(status.value).toBe('error')
      expect(error.value).toBe(failure)
      expect(ctx.payload.oops).toEqual({ __error: 'boom' })
    })
  })

  it('wraps non-Error rejections through the Error constructor', async () => {
    const { ctx, app } = setupServerContext()

    await app.runWithContext(async () => {
      const { error, status } = useAsyncData('weird', () =>
        Promise.reject('string-failure'),
      )
      await ctx.awaitAll()
      await nextTick()

      expect(status.value).toBe('error')
      expect(error.value).toBeInstanceOf(Error)
      expect(error.value?.message).toBe('string-failure')
      expect(ctx.payload.weird).toEqual({ __error: 'string-failure' })
    })
  })

  it('populates data from default() before the handler resolves', async () => {
    const { ctx, app } = setupServerContext()
    let resolveHandler!: (v: number) => void
    const handler = vi.fn(() => new Promise<number>((r) => { resolveHandler = r }))

    await app.runWithContext(async () => {
      const { data, status } = useAsyncData<number>('slow', handler, {
        default: () => 42,
      })
      await nextTick()

      expect(data.value).toBe(42)
      expect(status.value).toBe('pending')

      resolveHandler(100)
      await ctx.awaitAll()
      await nextTick()

      expect(data.value).toBe(100)
      expect(status.value).toBe('success')
    })
  })

  it('skips handler entirely when server: false is passed', async () => {
    const { ctx, app } = setupServerContext()
    const handler = vi.fn().mockResolvedValue('ignored')

    await app.runWithContext(async () => {
      useAsyncData('client-only', handler, { server: false })
      await ctx.awaitAll()

      expect(handler).not.toHaveBeenCalled()
      expect(ctx.payload['client-only']).toBeUndefined()
    })
  })

  it('refresh() re-runs the handler and clears a prior error', async () => {
    const { ctx, app } = setupServerContext()
    let attempts = 0
    const handler = vi.fn(async () => {
      attempts += 1
      if (attempts === 1) throw new Error('first try')
      return 'ok'
    })

    await app.runWithContext(async () => {
      const { refresh, data, status, error } = useAsyncData<string>('flaky', handler)
      await ctx.awaitAll()
      await nextTick()

      expect(status.value).toBe('error')
      expect(error.value?.message).toBe('first try')

      await refresh()
      await nextTick()

      expect(data.value).toBe('ok')
      expect(status.value).toBe('success')
      expect(error.value).toBeNull()
      expect(handler).toHaveBeenCalledTimes(2)
    })
  })

  it('retries a failing handler up to retry times and then succeeds', async () => {
    const { ctx, app } = setupServerContext()
    let attempts = 0
    const handler = vi.fn(async () => {
      attempts += 1
      if (attempts < 3) throw new Error(`attempt ${attempts}`)
      return 'finally'
    })

    await app.runWithContext(async () => {
      const { data, status, error } = useAsyncData<string>('retried', handler, { retryCount: 2 })
      await ctx.awaitAll()
      await nextTick()

      expect(handler).toHaveBeenCalledTimes(3)
      expect(data.value).toBe('finally')
      expect(status.value).toBe('success')
      expect(error.value).toBeNull()
    })
  })

  it('retries respect retryDelay', async () => {
    const { ctx, app } = setupServerContext()
    vi.useFakeTimers()
    let attempts = 0
    const handler = vi.fn(async () => {
      attempts += 1
      if (attempts < 2) throw new Error('fail')
      return 'ok'
    })

    await app.runWithContext(async () => {
      const promise = (async () => {
        const { data, status } = useAsyncData<string>('delayed', handler, { retryCount: 1, retryDelayMs: 100 })
        await ctx.awaitAll()
        await nextTick()
        return { data, status }
      })()

      await vi.advanceTimersByTimeAsync(50)
      expect(handler).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(100)
      const { data, status } = await promise

      expect(handler).toHaveBeenCalledTimes(2)
      expect(data.value).toBe('ok')
      expect(status.value).toBe('success')
    })

    vi.useRealTimers()
  })
})

describe('useAsyncData (client)', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {})
    setHydratedPayload({})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setHydratedPayload({})
  })

  it('seeds data from the hydrated payload and never runs the handler', async () => {
    setHydratedPayload({ fromServer: { already: 'there' } })
    const handler = vi.fn()

    const { data, status, pending } = useAsyncData<{ already: string }>('fromServer', handler)
    await nextTick()

    expect(handler).not.toHaveBeenCalled()
    expect(data.value).toEqual({ already: 'there' })
    expect(status.value).toBe('success')
    expect(pending.value).toBe(false)
  })

  it('runs the handler when the key is missing from the hydrated payload', async () => {
    const handler = vi.fn().mockResolvedValue('fetched')

    const { data, status } = useAsyncData<string>('newKey', handler)

    await vi.waitFor(() => {
      expect(data.value).toBe('fetched')
      expect(status.value).toBe('success')
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('applies default() while the handler is still pending', async () => {
    const handler = vi.fn().mockResolvedValue('real')

    const { data, pending } = useAsyncData<string>('defaulted', handler, {
      default: () => 'placeholder',
    })

    expect(data.value).toBe('placeholder')
    expect(pending.value).toBe(true)

    await vi.waitFor(() => {
      expect(data.value).toBe('real')
    })
  })

  it('hydrated payload overrides the default', async () => {
    setHydratedPayload({ preset: 'from-server' })
    const handler = vi.fn()

    const { data } = useAsyncData<string>('preset', handler, {
      default: () => 'from-default',
    })

    expect(data.value).toBe('from-server')
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('useAsyncData (reactive key + watch)', () => {
  // Client-side watcher tests need a Vue effect scope to register the
  // watchers and to exercise cleanup via onScopeDispose. We also stub
  // `window` so useAsyncData takes the client code path (the same trick
  // the 'client' describe block above uses).
  let scope: ReturnType<typeof effectScope>

  beforeEach(() => {
    vi.stubGlobal('window', {})
    setHydratedPayload({})
    scope = effectScope()
  })

  afterEach(() => {
    scope.stop()
    vi.unstubAllGlobals()
    setHydratedPayload({})
  })

  function inScope<T>(fn: () => T): T {
    let result!: T
    scope.run(() => {
      result = fn()
    })
    return result
  }

  it('re-fetches when a Ref<string> key changes', async () => {
    const key: Ref<string> = ref('a')
    const handler = vi.fn(async (k: string) => `result-${k}`)

    const { data, status } = inScope(() =>
      useAsyncData<string>(key, () => handler(key.value)),
    ) as ReturnType<typeof useAsyncData<string>>

    await vi.waitFor(() => {
      expect(data.value).toBe('result-a')
    })
    expect(handler).toHaveBeenCalledTimes(1)

    key.value = 'b'
    await nextTick()
    await vi.waitFor(() => {
      expect(data.value).toBe('result-b')
    })
    expect(handler).toHaveBeenCalledTimes(2)
    expect(status.value).toBe('success')
  })

  it('re-fetches when a getter key changes', async () => {
    const slug: Ref<string> = ref('apple')
    let count = 0

    const { data } = inScope(() =>
      useAsyncData<string>(
        () => `listing-${slug.value}`,
        async () => {
          count += 1
          return `payload-${slug.value}`
        },
      ),
    ) as ReturnType<typeof useAsyncData<string>>

    await vi.waitFor(() => {
      expect(data.value).toBe('payload-apple')
    })
    expect(count).toBe(1)

    slug.value = 'banana'
    await nextTick()
    await vi.waitFor(() => {
      expect(data.value).toBe('payload-banana')
    })
    expect(count).toBe(2)
  })

  it('resets pending/error state when key changes', async () => {
    const key: Ref<string> = ref('a')
    const handler = vi.fn(async (k: string) => {
      if (k === 'a') throw new Error('first fails')
      return `ok-${k}`
    })

    const { data, status, error } = inScope(() =>
      useAsyncData<string>(key, () => handler(key.value)),
    ) as ReturnType<typeof useAsyncData<string>>

    await vi.waitFor(() => {
      expect(status.value).toBe('error')
    })
    expect(error.value?.message).toBe('first fails')

    key.value = 'b'
    await nextTick()
    await vi.waitFor(() => {
      expect(data.value).toBe('ok-b')
    })
    expect(status.value).toBe('success')
    expect(error.value).toBeNull()
  })

  it('does not refetch when key is a static string', async () => {
    const handler = vi.fn(async () => 'once')

    const { data } = inScope(() =>
      useAsyncData<string>('static', handler),
    ) as ReturnType<typeof useAsyncData<string>>

    await vi.waitFor(() => {
      expect(data.value).toBe('once')
    })

    await nextTick()
    await nextTick()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('watch option re-runs handler when any source changes', async () => {
    const slug: Ref<string> = ref('x')
    const page: Ref<number> = ref(1)
    const handler = vi.fn(async () => `p=${slug.value}-${page.value}`)

    const { data } = inScope(() =>
      useAsyncData<string>(
        'paged',
        handler,
        { watch: [slug, page] },
      ),
    ) as ReturnType<typeof useAsyncData<string>>

    await vi.waitFor(() => {
      expect(data.value).toBe('p=x-1')
    })
    expect(handler).toHaveBeenCalledTimes(1)

    page.value = 2
    await nextTick()
    await vi.waitFor(() => {
      expect(data.value).toBe('p=x-2')
    })
    expect(handler).toHaveBeenCalledTimes(2)

    slug.value = 'y'
    await nextTick()
    await vi.waitFor(() => {
      expect(data.value).toBe('p=y-2')
    })
    expect(handler).toHaveBeenCalledTimes(3)
  })

  it('watch option accepts a single non-array source', async () => {
    const source: Ref<number> = ref(1)
    const handler = vi.fn(async (n: number) => n * 10)

    const { data } = inScope(() =>
      useAsyncData<number>(
        'single',
        async () => handler(source.value),
        { watch: source },
      ),
    ) as ReturnType<typeof useAsyncData<number>>

    await vi.waitFor(() => {
      expect(data.value).toBe(10)
    })

    source.value = 5
    await nextTick()
    await vi.waitFor(() => {
      expect(data.value).toBe(50)
    })
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('watch + reactive key fires only one fetch per change', async () => {
    const slug: Ref<string> = ref('a')
    let count = 0

    const { data } = inScope(() =>
      useAsyncData<string>(
        () => `listing-${slug.value}`,
        async () => {
          count += 1
          return slug.value
        },
        { watch: [slug] },
      ),
    ) as ReturnType<typeof useAsyncData<string>>

    await vi.waitFor(() => {
      expect(data.value).toBe('a')
    })
    expect(count).toBe(1)

    slug.value = 'b'
    await nextTick()
    await vi.waitFor(() => {
      expect(data.value).toBe('b')
    })
    // The key watcher (sync) fires first and re-fetches; the deps watcher
    // is gated on `keyChanging` and must skip. So count goes 1 -> 2.
    expect(count).toBe(2)
  })

  it('watch stops firing after scope disposal', async () => {
    const source: Ref<number> = ref(1)
    const handler = vi.fn(async (n: number) => n)

    const { data } = inScope(() =>
      useAsyncData<number>('scoped', async () => handler(source.value), {
        watch: source,
      }),
    ) as ReturnType<typeof useAsyncData<number>>

    await vi.waitFor(() => {
      expect(data.value).toBe(1)
    })

    scope.stop()
    source.value = 99
    await nextTick()
    await nextTick()
    // After dispose the watcher should not have re-run the handler.
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('plain string key does not set up a key watcher', async () => {
    const handler = vi.fn(async () => 'static-ok')

    const { data } = inScope(() =>
      useAsyncData<string>('static-key', handler),
    ) as ReturnType<typeof useAsyncData<string>>

    await vi.waitFor(() => {
      expect(data.value).toBe('static-ok')
    })

    await nextTick()
    await nextTick()
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('useAsyncData (server, reactive key)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('reactive key on the server uses the current key in the payload', async () => {
    const { ctx, app } = setupServerContext()
    const key: Ref<string> = ref('first')

    await app.runWithContext(async () => {
      useAsyncData<string>(key, async () => `result-${key.value}`)
      await ctx.awaitAll()
      await nextTick()

      expect(ctx.payload[key.value]).toBe('result-first')
    })
  })
})