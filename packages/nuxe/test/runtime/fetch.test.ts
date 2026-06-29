import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { $fetch as ofetch$fetch, createFetch as ofetchCreateFetch, FetchError, type FetchOptions } from 'ofetch'
import { $fetch, createFetch, FetchError as NuxeFetchError } from '../../lib/runtime/fetch'

let fetchMock: ReturnType<typeof vi.fn>

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  if (!headers.has('content-type')) headers.set('content-type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

describe('nuxe $fetch wrapper', () => {
  let savedEnv: Record<string, string | undefined>
  let savedWindow: unknown
  let hadWindow: boolean

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    savedEnv = { NUXE_BASE_URL: process.env.NUXE_BASE_URL }
    delete process.env.NUXE_BASE_URL
    hadWindow = typeof window !== 'undefined'
    if (hadWindow) savedWindow = (globalThis as Record<string, unknown>).window
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    if (hadWindow) (globalThis as Record<string, unknown>).window = savedWindow
    else delete (globalThis as Record<string, unknown>).window
  })

  it('resolves relative URLs to NUXE_BASE_URL on the server', async () => {
    process.env.NUXE_BASE_URL = 'http://localhost:4000'
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await $fetch('/api/me')

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe('http://localhost:4000/api/me')
  })

  it('falls back to http://localhost:3000 when NUXE_BASE_URL is unset', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await $fetch('/api/me')

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe('http://localhost:3000/api/me')
  })

  it('resolves relative URLs to window.location.origin on the client', async () => {
    ;(globalThis as Record<string, unknown>).window = {
      location: { origin: 'https://app.example.com' },
    }
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await $fetch('/api/me')

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe('https://app.example.com/api/me')
  })

  it('lets an explicit baseURL override the default', async () => {
    process.env.NUXE_BASE_URL = 'http://should-be-ignored'
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await $fetch('/api/me', { baseURL: 'https://override.example.com' })

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe('https://override.example.com/api/me')
  })

  it('passes absolute URLs through unchanged (ignoring baseURL)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await $fetch('https://coreapi.example.com/v1/users')

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe('https://coreapi.example.com/v1/users')
  })
})

describe('nuxe $fetch exports', () => {
  it('createFetch returns a callable independent instance', () => {
    const instance = createFetch()
    expect(typeof instance).toBe('function')
    expect(instance).not.toBe($fetch)
  })

  it('FetchError re-export matches the ofetch class', () => {
    const a = new NuxeFetchError('test')
    const b = new FetchError('test')
    expect(a).toBeInstanceOf(FetchError)
    expect(b).toBeInstanceOf(NuxeFetchError)
  })

  it('FetchOptions is usable as a type', () => {
    const opts: FetchOptions = { method: 'POST' }
    expect(opts.method).toBe('POST')
  })

  it('$fetch itself is callable', () => {
    expect(typeof $fetch).toBe('function')
  })

  it('$fetch is distinct from the raw ofetch $fetch (it carries defaults)', () => {
    expect($fetch).not.toBe(ofetch$fetch)
    expect(ofetchCreateFetch).toBeDefined()
  })
})
