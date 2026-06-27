import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import {
  createRequestContext,
  runWithContext,
  setHydratedPayload,
  useAsyncData,
} from '../../lib/runtime'

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
    const ctx = createRequestContext()
    const handler = vi.fn().mockResolvedValue({ hello: 'world' })

    await runWithContext(ctx, async () => {
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
    const ctx = createRequestContext()
    const failure = new Error('boom')

    await runWithContext(ctx, async () => {
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
    const ctx = createRequestContext()

    await runWithContext(ctx, async () => {
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
    const ctx = createRequestContext()
    let resolveHandler!: (v: number) => void
    const handler = vi.fn(() => new Promise<number>((r) => { resolveHandler = r }))

    await runWithContext(ctx, async () => {
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
    const ctx = createRequestContext()
    const handler = vi.fn().mockResolvedValue('ignored')

    await runWithContext(ctx, async () => {
      useAsyncData('client-only', handler, { server: false })
      await ctx.awaitAll()

      expect(handler).not.toHaveBeenCalled()
      expect(ctx.payload['client-only']).toBeUndefined()
    })
  })

  it('refresh() re-runs the handler and clears a prior error', async () => {
    const ctx = createRequestContext()
    let attempts = 0
    const handler = vi.fn(async () => {
      attempts += 1
      if (attempts === 1) throw new Error('first try')
      return 'ok'
    })

    await runWithContext(ctx, async () => {
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
    const ctx = createRequestContext()
    let attempts = 0
    const handler = vi.fn(async () => {
      attempts += 1
      if (attempts < 3) throw new Error(`attempt ${attempts}`)
      return 'finally'
    })

    await runWithContext(ctx, async () => {
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
    const ctx = createRequestContext()
    vi.useFakeTimers()
    let attempts = 0
    const handler = vi.fn(async () => {
      attempts += 1
      if (attempts < 2) throw new Error('fail')
      return 'ok'
    })

    await runWithContext(ctx, async () => {
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