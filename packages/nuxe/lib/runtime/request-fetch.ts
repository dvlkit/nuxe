import type { $Fetch } from 'ofetch'
import { $fetch as ofetch$fetch, createFetch } from 'ofetch'
import { useNuxeApp } from '../plugins/runtime'

export function useRequestFetch(event?: { req?: { headers?: Headers; url?: string } }): $Fetch {
  if (typeof window !== 'undefined') {
    return ofetch$fetch as $Fetch
  }

  const ssrRequest = event?.req ?? useNuxeApp()?.ssrContext?.request as
    | { headers?: Headers; url?: string }
    | undefined

  if (!ssrRequest?.headers) {
    return ofetch$fetch as $Fetch
  }

  const requestHeaders: Record<string, string> = {}
  ssrRequest.headers.forEach((value, key) => {
    requestHeaders[key] = value
  })

  let baseURL: string | undefined
  if (ssrRequest.url) {
    try {
      baseURL = new URL(ssrRequest.url, 'http://localhost').origin
    } catch {
      baseURL = undefined
    }
  }

  return createFetch({
    defaults: {
      onRequest({ options, request }) {
        const headers = new Headers(options.headers)
        for (const [key, value] of Object.entries(requestHeaders)) {
          if (!headers.has(key)) headers.set(key, value)
        }
        options.headers = headers
        const url = String(request)
        if (/^https?:\/\//i.test(url)) {
          delete options.baseURL
        } else if (baseURL && !options.baseURL) {
          options.baseURL = baseURL
        }
      },
    },
  }) as $Fetch
}