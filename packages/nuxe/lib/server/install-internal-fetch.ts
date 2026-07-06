import { definePlugin } from 'nitro'
import { serverFetch } from 'nitro/app'
import { getCurrentRequest } from '../runtime/request-event-context'

const PATCHED = Symbol.for('@dvlkit/nuxe/internal-fetch-patched')
const ORIGINAL_FETCH = Symbol.for('@dvlkit/nuxe/internal-fetch-original')
const NITRO_FETCH = Symbol.for('@dvlkit/nuxe/internal-fetch-nitro')

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function mergeHeaders(parentHeaders: HeadersInit | undefined, initHeaders: HeadersInit | undefined): Headers {
  const merged = new Headers(parentHeaders)
  const incoming = new Headers(initHeaders)

  incoming.forEach((value, key) => {
    merged.set(key, value)
  })

  return merged
}

function isInternalUrl(url: string): boolean {
  if (url[0] === '/') return true

  try {
    const target = new URL(url)
    const baseUrl = process.env.NUXE_BASE_URL ?? 'http://localhost:3000'
    const base = new URL(baseUrl)
    return target.origin === base.origin
  } catch {
    return false
  }
}

export default definePlugin((nitroApp) => {
  const globals = globalThis as Record<symbol, unknown>

  globals[NITRO_FETCH] = nitroApp.fetch

  if (globals[PATCHED]) {
    return
  }

  const originalFetch = globalThis.fetch.bind(globalThis)

  function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = resolveUrl(input)
    const parentRequest = getCurrentRequest()

    if (!isInternalUrl(url)) {
      return originalFetch(input, init)
    }

    if (parentRequest) {
      const headers = mergeHeaders(parentRequest.headers, init?.headers)
      headers.set('host', new URL(parentRequest.url).host)

      const req = new Request(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url, {
        ...init,
        headers,
      })

      return serverFetch(req, undefined, { parent: parentRequest })
    }

    return (globals[NITRO_FETCH] as (i: RequestInfo | URL, init?: RequestInit) => Promise<Response>)(input, init)
  }

  globals[ORIGINAL_FETCH] = originalFetch
  globals[PATCHED] = true
  globalThis.fetch = patchedFetch as typeof globalThis.fetch
})