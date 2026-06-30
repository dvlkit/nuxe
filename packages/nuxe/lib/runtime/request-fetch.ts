import type { $Fetch } from 'ofetch'
import { $fetch as ofetch$fetch, createFetch } from 'ofetch'
import { useNuxeApp } from '../plugins/runtime'

export function useRequestFetch(): $Fetch {
  if (typeof window !== 'undefined') {
    return ofetch$fetch as $Fetch
  }

  const nuxeApp = useNuxeApp()
  const ssrRequest = nuxeApp?.ssrContext?.request as
    | { headers?: Headers }
    | undefined

  if (!ssrRequest?.headers) {
    return ofetch$fetch as $Fetch
  }

  const requestHeaders: Record<string, string> = {}
  ssrRequest.headers.forEach((value, key) => {
    requestHeaders[key] = value
  })

  return createFetch({
  defaults: {
    onRequest({ options }) {
      const headers = new Headers(options.headers)
      for (const [key, value] of Object.entries(requestHeaders)) {
        if (!headers.has(key)) headers.set(key, value)
      }
      options.headers = headers
    },
  },
}) as $Fetch
}