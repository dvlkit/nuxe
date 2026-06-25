import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { useFetch } from '../../lib'
import { createRequestContext, runWithContext } from '../../lib/runtime'
import { setHydratedPayload } from '../../lib'

let fetchMock: ReturnType<typeof vi.fn>

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  if (!headers.has('content-type')) headers.set('content-type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

function mockResponseOnce(response: Response): void {
  fetchMock.mockResolvedValueOnce(response.clone())
}

describe('useFetch', () => {
  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('return shape', () => {
    it('returns the useAsyncData shape plus statusCode', () => {
      mockResponseOnce(jsonResponse({}))
      const result = useFetch('/api/x')

      expect(result.data).toBeDefined()
      expect(result.pending).toBeDefined()
      expect(result.error).toBeDefined()
      expect(result.status).toBeDefined()
      expect(result.refresh).toBeInstanceOf(Function)
      expect(result.statusCode).toBeDefined()
      expect(result.statusCode.value).toBeNull()
    })

    it('statusCode starts null before the first fetch resolves', () => {
      fetchMock.mockImplementation(() => new Promise(() => {}))
      const { statusCode } = useFetch('/api/x')
      expect(statusCode.value).toBeNull()
    })
  })

  describe('successful fetch', () => {
    it('populates data and sets statusCode to 200 on success', async () => {
      mockResponseOnce(jsonResponse({ hello: 'world' }))
      const { data, status, statusCode } = useFetch<{ hello: string }>('/api/x')

      await vi.waitFor(() => {
        expect(data.value).toEqual({ hello: 'world' })
        expect(status.value).toBe('success')
        expect(statusCode.value).toBe(200)
      })
    })

    it('respects a custom status code in the response', async () => {
      mockResponseOnce(jsonResponse({ created: true }, { status: 201 }))
      const { data, statusCode } = useFetch<{ created: boolean }>('/api/x', { key: 'create' })

      await vi.waitFor(() => {
        expect(data.value).toEqual({ created: true })
        expect(statusCode.value).toBe(201)
      })
    })
  })

  describe('error handling', () => {
    it('captures statusCode on non-OK response (e.g., 404)', async () => {
      mockResponseOnce(jsonResponse({ message: 'not found' }, { status: 404, statusText: 'Not Found' }))
      const { data, error, statusCode, status } = useFetch('/api/x', { key: 'err' })

      await vi.waitFor(() => {
        expect(status.value).toBe('error')
        expect(error.value).toBeInstanceOf(Error)
        expect(statusCode.value).toBe(404)
      })
      expect(data.value).toBeNull()
    })

    it('statusCode stays null on network failure (no status)', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      const { error, statusCode, status } = useFetch('/api/x', { key: 'net' })

      await vi.waitFor(() => {
        expect(status.value).toBe('error')
        expect(error.value).toBeInstanceOf(Error)
        expect(statusCode.value).toBeNull()
      })
    })

    it('chains user-provided onResponse with internal statusCode capture', async () => {
      mockResponseOnce(jsonResponse({}, { status: 200 }))
      const seen: number[] = []
      const { statusCode } = useFetch('/api/x', {
        key: 'chain',
        onResponse: ({ response }) => { seen.push(response.status) },
      })

      await vi.waitFor(() => {
        expect(seen).toEqual([200])
        expect(statusCode.value).toBe(200)
      })
    })

    it('chains user-provided onError with internal statusCode capture', async () => {
      mockResponseOnce(jsonResponse({ message: 'oops' }, { status: 500 }))
      const seenStatuses: (number | undefined)[] = []
      const { statusCode } = useFetch('/api/x', {
        key: 'chain-err',
        onError: ({ error }) => { seenStatuses.push(error.status) },
      })

      await vi.waitFor(() => {
        expect(seenStatuses).toEqual([500])
        expect(statusCode.value).toBe(500)
      })
    })
  })

  describe('key handling', () => {
    it('defaults the key to the url string when none provided', async () => {
      const ctx = createRequestContext()
      mockResponseOnce(jsonResponse({ ok: 1 }))

      await runWithContext(ctx, async () => {
        useFetch('/api/x')
        await ctx.awaitAll()
        expect(ctx.payload['/api/x']).toEqual({ ok: 1 })
      })
    })

    it('uses options.key when provided (overrides url-as-key default)', async () => {
      const ctx = createRequestContext()
      mockResponseOnce(jsonResponse({ ok: 1 }))

      await runWithContext(ctx, async () => {
        useFetch('/api/x', { key: 'custom-key' })
        await ctx.awaitAll()
        expect(ctx.payload['custom-key']).toEqual({ ok: 1 })
        expect(ctx.payload['/api/x']).toBeUndefined()
      })
    })

    it('throws when url is a function and no key is provided', () => {
      expect(() => useFetch(() => '/api/x')).toThrow(
        '[nuxe] useFetch: `options.key` is required when url is a function',
      )
    })

    it('accepts a function url with an explicit key', async () => {
      const ctx = createRequestContext()
      mockResponseOnce(jsonResponse({ ok: 1 }))

      await runWithContext(ctx, async () => {
        useFetch(() => '/api/x', { key: 'fn-key' })
        await ctx.awaitAll()
        expect(ctx.payload['fn-key']).toEqual({ ok: 1 })
      })
    })
  })

  describe('reactivity', () => {
    it('refetches when a reactive url (function form) changes', async () => {
      const urlRef = ref('/api/x')
      mockResponseOnce(jsonResponse({ url: 'x' }))

      const { data } = useFetch<{ url: string }>(() => urlRef.value, { key: 'reactive' })

      await vi.waitFor(() => expect(data.value).toEqual({ url: 'x' }))

      mockResponseOnce(jsonResponse({ url: 'y' }))
      urlRef.value = '/api/y'

      await vi.waitFor(() => expect(data.value).toEqual({ url: 'y' }))
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('refetches when an explicit watch source changes', async () => {
      const filter = ref('all')
      mockResponseOnce(jsonResponse({ filter: 'all' }))

      const { data } = useFetch<{ filter: string }>('/api/x', {
        key: 'watched',
        watch: [filter],
      })

      await vi.waitFor(() => expect(data.value).toEqual({ filter: 'all' }))

      mockResponseOnce(jsonResponse({ filter: 'active' }))
      filter.value = 'active'

      await vi.waitFor(() => expect(data.value).toEqual({ filter: 'active' }))
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('option pass-through', () => {
    it('passes query, headers, and baseURL through to fetch', async () => {
      mockResponseOnce(jsonResponse({}))
      useFetch('/api/x', {
        key: 'opts',
        query: { q: 'hello' },
        headers: { 'x-custom': 'value' },
        baseURL: 'https://api.example.com',
      })

      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe('https://api.example.com/api/x?q=hello')
        expect((options.headers as Headers).get('x-custom')).toBe('value')
      })
    })

    it('applies default() while the handler is pending', async () => {
      fetchMock.mockImplementation(() => new Promise(() => {}))
      const { data, pending } = useFetch<string>('/api/x', {
        key: 'defaulted',
        default: () => 'placeholder',
      })

      expect(data.value).toBe('placeholder')
      expect(pending.value).toBe(true)
    })

    it('skips the handler when server: false (on server)', async () => {
      vi.unstubAllGlobals()
      fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      const ctx = createRequestContext()

      await runWithContext(ctx, async () => {
        useFetch('/api/x', { key: 'client-only', server: false })
        await ctx.awaitAll()

        expect(fetchMock).not.toHaveBeenCalled()
        expect(ctx.payload['client-only']).toBeUndefined()
      })
    })

    it('runs the handler normally when server is not specified', async () => {
      const ctx = createRequestContext()
      mockResponseOnce(jsonResponse({ ok: 1 }))

      await runWithContext(ctx, async () => {
        useFetch('/api/x', { key: 'server-ok' })
        await ctx.awaitAll()
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(ctx.payload['server-ok']).toEqual({ ok: 1 })
      })
    })
  })

  describe('client-side hydration', () => {
    it('seeds data from the hydrated payload and skips the fetch', async () => {
      setHydratedPayload({ '/api/x': { hydrated: true } })
      const { data, status } = useFetch<{ hydrated: boolean }>('/api/x')

      await nextTick()
      expect(data.value).toEqual({ hydrated: true })
      expect(status.value).toBe('success')
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})