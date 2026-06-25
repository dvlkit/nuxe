import { describe, expect, it, vi } from 'vitest'
import { $fetch, type $Fetch, createFetch, FetchError, type FetchOptions, } from 'ofetch'

let fetchMock: ReturnType<typeof vi.fn>

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  if (!headers.has('content-type')) headers.set('content-type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

describe('$fetch (ofetch re-export)', () => {
  describe('exports', () => {
    it('$fetch is callable as a function', () => {
      expect(typeof $fetch).toBe('function')
    })

    it('createFetch is callable and returns a $Fetch instance', () => {
      const instance = createFetch()
      expect(typeof instance).toBe('function')
    })

    it('FetchError is the ofetch error class', () => {
      const err = new FetchError('test')
      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(FetchError)
      expect(err.name).toBe('FetchError')
      expect(err.message).toBe('test')
    })

    it('FetchOptions is exported as a type', () => {
      const opts: FetchOptions = { method: 'POST' }
      expect(opts.method).toBe('POST')
    })

    it('$Fetch type is exported (compile-time check)', () => {
      expect($fetch).toBe($fetch)
    })
  })

  describe('integration smoke', () => {
    it('singleton $fetch calls global fetch and parses JSON', async () => {
      fetchMock = vi.fn().mockResolvedValueOnce(
        jsonResponse({ hello: 'world' }),
      )
      vi.stubGlobal('fetch', fetchMock)

      try {
        const data = await $fetch<{ hello: string }>('https://api.example.com/x')
        expect(data).toEqual({ hello: 'world' })
        expect(fetchMock).toHaveBeenCalledTimes(1)
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('singleton $fetch throws FetchError on non-OK with status', async () => {
      fetchMock = vi.fn().mockResolvedValueOnce(
        jsonResponse({ message: 'not found' }, { status: 404, statusText: 'Not Found' }),
      )
      vi.stubGlobal('fetch', fetchMock)

      try {
        try {
          await $fetch('https://api.example.com/x')
          expect.fail('should have thrown')
        } catch (err) {
          const fe = err as FetchError
          expect(fe).toBeInstanceOf(FetchError)
          expect(fe.status).toBe(404)
          expect(fe.statusText).toBe('Not Found')
          expect(fe.data).toEqual({ message: 'not found' })
        }
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('singleton $fetch throws FetchError on network failure', async () => {
      fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      vi.stubGlobal('fetch', fetchMock)

      try {
        try {
          await $fetch('https://api.example.com/x', { retry: 0 })
          expect.fail('should have thrown')
        } catch (err) {
          const fe = err as FetchError
          expect(fe).toBeInstanceOf(FetchError)
          expect(fe.status).toBeUndefined()
          expect(fe.message).toMatch(/Failed to fetch/)
        }
      } finally {
        vi.unstubAllGlobals()
      }
    })
  })

  describe('createFetch factory', () => {
    it('returns a callable instance independent of $fetch', () => {
      const instance = createFetch()
      expect(instance).not.toBe($fetch)
      expect(typeof instance).toBe('function')
    })
  })
})