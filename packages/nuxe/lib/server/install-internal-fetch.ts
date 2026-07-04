import { definePlugin } from 'nitro'
import { fetchWithEvent, H3Event } from 'h3'
import { type } from 'node:os'
import { getCurrentRequest } from '../runtime/request-event-context'

const PATCHED = Symbol.for('@dvlkit/nuxe/internal-fetch-patched')
const ORIGINAL_FETCH = Symbol.for('@dvlkit/nuxe/internal-fetch-original')
const NITRO_FETCH = Symbol.for('@dvlkit/nuxe/internal-fetch-nitro')

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function rawRequestToEvent(rawRequest: Request, app: unknown): H3Event {
  return {
    req: {
      headers: rawRequest.headers,
      ...(typeof (rawRequest as { runtime?: unknown }).runtime !== 'undefined' ? {
        runtime: (rawRequest as {
          runtime?: unknown
        }).runtime
      } : {}),
      ...(typeof (rawRequest as { waitUntil?: unknown }).waitUntil !== 'undefined' ? {
        waitUntil: (rawRequest as {
          waitUntil?: unknown
        }).waitUntil
      } : {}),
      ...(typeof (rawRequest as { ip?: unknown }).ip !== 'undefined' ? {ip: (rawRequest as { ip?: unknown }).ip} : {}),
    },
    url: new URL(rawRequest.url),
    app,
  } as unknown as H3Event
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

    if (url[0] !== '/') {
      return originalFetch(input, init)
    }

    const parentRequest = getCurrentRequest()
    if (parentRequest) {
      const event = rawRequestToEvent(parentRequest, nitroApp)
      return fetchWithEvent(event, url, init)
    }

    return (globals[NITRO_FETCH] as (i: RequestInfo | URL, init?: RequestInit) => Promise<Response>)(input, init)
  }

  globals[ORIGINAL_FETCH] = originalFetch
  globals[PATCHED] = true
  globalThis.fetch = patchedFetch as typeof globalThis.fetch

  console.info('[nuxe] globalThis.fetch patched for internal SSR routing')
})