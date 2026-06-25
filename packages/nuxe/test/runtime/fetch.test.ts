import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  $fetch,
  createFetch,
  FetchError,
  type FetchOptions,
} from '../../lib'

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  if (!headers.has('content-type')) headers.set('content-type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

let fetchMock: ReturnType<typeof vi.fn>

function mockResponseOnce(response: Response): void {
  fetchMock.mockResolvedValueOnce(response.clone())
}

describe('$fetch', () => {
  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    $fetch.interceptors.request.clear()
    $fetch.interceptors.response.clear()
    $fetch.interceptors.error.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('request shape', () => {
    it('sends GET by default and produces a Request instance', async () => {
      mockResponseOnce(jsonResponse({ ok: true }))
      await $fetch('/api/x')
      const [req] = fetchMock.mock.calls[0] as [Request]
      expect(req).toBeInstanceOf(Request)
      expect(req.method).toBe('GET')
    })

    it('serializes a plain object body as JSON and sets content-type', async () => {
      mockResponseOnce(jsonResponse({ ok: true }))
      await $fetch('/api/x', { method: 'POST', body: { a: 1, b: 'two' } })
      const req = fetchMock.mock.calls[0][0] as Request
      expect(req.method).toBe('POST')
      expect(req.headers.get('content-type')).toBe('application/json')
      expect(await req.text()).toBe('{"a":1,"b":"two"}')
    })

    it('always JSON-stringifies plain object bodies, even when caller overrides content-type', async () => {
      mockResponseOnce(jsonResponse({ ok: true }))
      await $fetch('/api/x', {
        method: 'POST',
        body: { a: 1 },
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      })
      const req = fetchMock.mock.calls[0][0] as Request
      expect(req.headers.get('content-type')).toBe('application/x-www-form-urlencoded')
      expect(await req.text()).toBe('{"a":1}')
    })

    it('passes through a string body; Request constructor auto-sets text/plain content-type', async () => {
      mockResponseOnce(jsonResponse({ ok: true }))
      await $fetch('/api/x', { method: 'POST', body: 'raw=1' })
      const req = fetchMock.mock.calls[0][0] as Request
      expect(req.headers.get('content-type')).toBe('text/plain;charset=UTF-8')
      expect(await req.text()).toBe('raw=1')
    })

    it('passes through FormData unchanged and lets Request auto-set multipart content-type', async () => {
      const fd = new FormData()
      fd.append('a', '1')
      fd.append('b', '2')
      mockResponseOnce(jsonResponse({ ok: true }))
      await $fetch('/api/x', { method: 'POST', body: fd })
      const req = fetchMock.mock.calls[0][0] as Request
      const received = await req.formData()
      expect(received.get('a')).toBe('1')
      expect(received.get('b')).toBe('2')
    })

    it('uppercases the method and supports CRUD verbs', async () => {
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
        mockResponseOnce(jsonResponse({}))
        await $fetch('/api/x', { method })
      }
      const methods = fetchMock.mock.calls.map((c) => (c[0] as Request).method)
      expect(methods).toEqual(['POST', 'PUT', 'PATCH', 'DELETE'])
    })
  })

  describe('headers', () => {
    it('sets accept: application/json by default', async () => {
      mockResponseOnce(jsonResponse({}))
      await $fetch('/api/x')
      expect((fetchMock.mock.calls[0][0] as Request).headers.get('accept')).toBe('application/json')
    })

    it('sets content-type when body is a plain object on POST/PUT/PATCH', async () => {
      mockResponseOnce(jsonResponse({}))
      await $fetch('/api/x', { method: 'POST', body: { a: 1 } })
      expect((fetchMock.mock.calls[0][0] as Request).headers.get('content-type')).toBe('application/json')
    })

    it('does NOT set content-type for GET with no body', async () => {
      mockResponseOnce(jsonResponse({}))
      await $fetch('/api/x')
      expect((fetchMock.mock.calls[0][0] as Request).headers.get('content-type')).toBeNull()
    })

    it('does NOT set content-type for HEAD with no body', async () => {
      mockResponseOnce(jsonResponse({}))
      await $fetch('/api/x', { method: 'HEAD' })
      expect((fetchMock.mock.calls[0][0] as Request).headers.get('content-type')).toBeNull()
    })

    it('merges per-call headers over factory defaults (per-call wins on conflict)', async () => {
      const localFetch = createFetch({
        headers: { 'x-default': 'd', 'x-override': 'd', accept: 'application/xml' },
      })
      mockResponseOnce(jsonResponse({}))
      await localFetch('/api/x', {
        headers: { 'x-override': 'o', 'x-extra': 'e', accept: 'application/json' },
      })
      const req = fetchMock.mock.calls[0][0] as Request
      expect(req.headers.get('x-default')).toBe('d')
      expect(req.headers.get('x-override')).toBe('o')
      expect(req.headers.get('x-extra')).toBe('e')
      expect(req.headers.get('accept')).toBe('application/json')
    })
  })

  describe('url building', () => {
    it('appends query params via URLSearchParams (numeric values coerced to string)', async () => {
      mockResponseOnce(jsonResponse({}))
      await $fetch('/api/x', { query: { a: '1', b: 2, c: true } })
      const url = (fetchMock.mock.calls[0][0] as Request).url
      expect(url).toContain('a=1')
      expect(url).toContain('b=2')
      expect(url).toContain('c=true')
    })

    it('repeats array query params', async () => {
      mockResponseOnce(jsonResponse({}))
      await $fetch('/api/x', { query: { tag: ['a', 'b', 'c'] } })
      const url = (fetchMock.mock.calls[0][0] as Request).url
      expect(url).toContain('tag=a')
      expect(url).toContain('tag=b')
      expect(url).toContain('tag=c')
    })

    it('composes a relative url against factory baseURL', async () => {
      const localFetch = createFetch({ baseURL: 'https://api.example.com' })
      mockResponseOnce(jsonResponse({}))
      await localFetch('/v1/users')
      expect((fetchMock.mock.calls[0][0] as Request).url).toBe('https://api.example.com/v1/users')
    })

    it('lets per-call baseURL override the factory baseURL', async () => {
      const localFetch = createFetch({ baseURL: 'https://api.example.com' })
      mockResponseOnce(jsonResponse({}))
      await localFetch('/v1/users', { baseURL: 'https://other.example.com' })
      expect((fetchMock.mock.calls[0][0] as Request).url).toBe('https://other.example.com/v1/users')
    })

    it('appends query params to a path-only url without a base (uses localhost fallback)', async () => {
      mockResponseOnce(jsonResponse({}))
      await $fetch('/api/x', { query: { q: 'hello' } })
      const url = (fetchMock.mock.calls[0][0] as Request).url
      expect(url).toMatch(/\/api\/x\?q=hello$/)
    })

    it('falls back to http://localhost when no baseURL is provided for a relative url', async () => {
      mockResponseOnce(jsonResponse({}))
      await $fetch('/api/x')
      expect((fetchMock.mock.calls[0][0] as Request).url).toBe('http://localhost/api/x')
    })
  })

  describe('response handling', () => {
    it('parses JSON content-type by default', async () => {
      mockResponseOnce(jsonResponse({ hello: 'world' }))
      const data = await $fetch<{ hello: string }>('/api/x')
      expect(data).toEqual({ hello: 'world' })
    })

    it('returns undefined for 204 No Content', async () => {
      mockResponseOnce(new Response(null, { status: 204 }))
      const data = await $fetch('/api/x')
      expect(data).toBeUndefined()
    })

    it('parses as text when content-type is not JSON', async () => {
      mockResponseOnce(new Response('plain text', { headers: { 'content-type': 'text/plain' } }))
      const data = await $fetch('/api/x')
      expect(data).toBe('plain text')
    })

    it('respects responseType: blob', async () => {
      mockResponseOnce(new Response('blob content', { headers: { 'content-type': 'application/octet-stream' } }))
      const data = await $fetch('/api/x', { responseType: 'blob' })
      expect(data).toBeInstanceOf(Blob)
    })

    it('throws FetchError on 4xx with status, statusText, parsed data, and response', async () => {
      mockResponseOnce(jsonResponse({ message: 'not found' }, { status: 404, statusText: 'Not Found' }))
      try {
        await $fetch('/api/x')
        expect.fail('should have thrown')
      } catch (err) {
        const fe = err as FetchError
        expect(fe).toBeInstanceOf(FetchError)
        expect(fe.status).toBe(404)
        expect(fe.statusText).toBe('Not Found')
        expect(fe.data).toEqual({ message: 'not found' })
        expect(fe.response).toBeInstanceOf(Response)
      }
    })

    it('throws FetchError on 5xx', async () => {
      mockResponseOnce(jsonResponse({ error: 'kaput' }, { status: 500, statusText: 'Server Error' }))
      try {
        await $fetch('/api/x')
        expect.fail('should have thrown')
      } catch (err) {
        expect(err).toMatchObject({
          status: 500,
          statusText: 'Server Error',
          data: { error: 'kaput' },
        })
      }
    })

    it('throws FetchError on network failure with no status', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      try {
        await $fetch('/api/x')
        expect.fail('should have thrown')
      } catch (err) {
        const fe = err as FetchError
        expect(fe).toBeInstanceOf(FetchError)
        expect(fe.status).toBeUndefined()
        expect(fe.response).toBeUndefined()
        expect(fe.message).toBe('Failed to fetch')
      }
    })
  })

  describe('interceptors', () => {
    it('runs onRequest per-call with the constructed request', async () => {
      let captured: Request | undefined
      mockResponseOnce(jsonResponse({}))
      await $fetch('/api/x', {
        onRequest: ({ request }) => { captured = request },
      })
      expect(captured).toBeInstanceOf(Request)
      expect(captured!.url).toBe('http://localhost/api/x')
    })

    it('runs global request interceptors in registration order', async () => {
      const order: string[] = []
      $fetch.interceptors.request.use(async () => { order.push('a') })
      $fetch.interceptors.request.use(async () => { order.push('b') })
      $fetch.interceptors.request.use(async () => { order.push('c') })
      mockResponseOnce(jsonResponse({}))
      await $fetch('/api/x')
      expect(order).toEqual(['a', 'b', 'c'])
    })

    it('runs per-call onRequest AND global interceptors (per-call first)', async () => {
      const order: string[] = []
      $fetch.interceptors.request.use(async () => { order.push('global') })
      mockResponseOnce(jsonResponse({}))
      await $fetch('/api/x', {
        onRequest: () => { order.push('per-call') },
      })
      expect(order).toEqual(['per-call', 'global'])
    })

    it('runs onResponse per-call with status', async () => {
      const statuses: number[] = []
      mockResponseOnce(jsonResponse({}))
      await $fetch('/api/x', {
        onResponse: ({ response }) => { statuses.push(response.status) },
      })
      expect(statuses).toEqual([200])
    })

    it('runs global response interceptors in order', async () => {
      const order: string[] = []
      $fetch.interceptors.response.use(async () => { order.push('r1') })
      $fetch.interceptors.response.use(async () => { order.push('r2') })
      mockResponseOnce(jsonResponse({}))
      await $fetch('/api/x')
      expect(order).toEqual(['r1', 'r2'])
    })

    it('runs error interceptors on non-OK response', async () => {
      const order: string[] = []
      $fetch.interceptors.error.use(async () => { order.push('e1') })
      $fetch.interceptors.error.use(async () => { order.push('e2') })
      mockResponseOnce(jsonResponse({}, { status: 500 }))
      try {
        await $fetch('/api/x')
        expect.fail('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(FetchError)
      }
      expect(order).toEqual(['e1', 'e2'])
    })

    it('runs error interceptors on network failure', async () => {
      const order: string[] = []
      $fetch.interceptors.error.use(async () => { order.push('net') })
      fetchMock.mockRejectedValueOnce(new TypeError('boom'))
      try {
        await $fetch('/api/x')
        expect.fail('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(FetchError)
      }
      expect(order).toEqual(['net'])
    })

    it('runs onError per-call on non-OK response', async () => {
      let receivedStatus: number | undefined
      mockResponseOnce(jsonResponse({}, { status: 418 }))
      try {
        await $fetch('/api/x', {
          onError: ({ error }) => { receivedStatus = error.status },
        })
        expect.fail('should have thrown')
      } catch {
        // expected
      }
      expect(receivedStatus).toBe(418)
    })

    it('clear() empties the interceptor list', async () => {
      const order: string[] = []
      $fetch.interceptors.request.use(async () => { order.push('keep') })
      $fetch.interceptors.request.clear()
      mockResponseOnce(jsonResponse({}))
      await $fetch('/api/x')
      expect(order).toEqual([])
    })
  })

  describe('createFetch factory', () => {
    it('produces isolated instances with their own defaults', async () => {
      const a = createFetch({ headers: { 'x-id': 'a' } })
      const b = createFetch({ headers: { 'x-id': 'b' } })

      mockResponseOnce(jsonResponse({}))
      await a('/api/x')
      expect((fetchMock.mock.calls[0][0] as Request).headers.get('x-id')).toBe('a')

      mockResponseOnce(jsonResponse({}))
      await b('/api/x')
      expect((fetchMock.mock.calls[1][0] as Request).headers.get('x-id')).toBe('b')
    })

    it('does not share interceptors between factory instances', async () => {
      const a = createFetch()
      const order: string[] = []
      a.interceptors.request.use(async () => { order.push('a-only') })
      mockResponseOnce(jsonResponse({}))
      await $fetch('/api/x')
      expect(order).toEqual([])
    })

    it('singleton $fetch and createFetch() are different instances', async () => {
      const fresh = createFetch()
      expect(fresh).not.toBe($fetch)
      expect(typeof fresh).toBe('function')
      expect(typeof fresh.interceptors.request.use).toBe('function')
    })
  })

  describe('FetchError', () => {
    it('is named FetchError and extends Error', () => {
      const e = new FetchError('test')
      expect(e).toBeInstanceOf(Error)
      expect(e).toBeInstanceOf(FetchError)
      expect(e.name).toBe('FetchError')
      expect(e.message).toBe('test')
    })

    it('carries arbitrary fields via the constructor options', () => {
      const e = new FetchError('bad', { status: 400, statusText: 'Bad Request', data: { reason: 'x' } })
      expect(e.status).toBe(400)
      expect(e.statusText).toBe('Bad Request')
      expect(e.data).toEqual({ reason: 'x' })
    })
  })

  it('FetchOptions is exported', () => {
    const opts: FetchOptions = { method: 'POST', body: { a: 1 } }
    expect(opts.method).toBe('POST')
  })
})