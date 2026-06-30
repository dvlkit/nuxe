import { useNuxeApp } from '../plugins/runtime'

export function useRequestEvent(): Request | undefined {
  if (typeof window !== 'undefined') return undefined
  const nuxeApp = useNuxeApp()
  return nuxeApp.ssrContext?.request as Request | undefined
}

export function useRequestHeaders(): Record<string, string> {
  if (typeof window !== 'undefined') return {}
  const event = useRequestEvent()
  if (!event) return {}
  const headers: Record<string, string> = {}
  event.headers.forEach((value, key) => {
    headers[key] = value
  })
  return headers
}

export function useRequestURL(
  opts: { xForwardedHost?: boolean; xForwardedProto?: boolean } = {},
): URL {
  if (typeof window !== 'undefined') {
    return new URL(globalThis.location.href)
  }

  const nuxeApp = useNuxeApp()
  const request = nuxeApp.ssrContext?.request as Request | undefined

  if (!request) {
    const fallback = (nuxeApp.ssrContext?.url as string) ?? '/'
    return new URL(fallback, 'http://localhost')
  }

  const raw = request.url
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return new URL(raw)
  }

  const headers = request.headers
  const xfh = opts.xForwardedHost !== false ? headers.get('x-forwarded-host') : null
  const xfp = opts.xForwardedProto !== false ? headers.get('x-forwarded-proto') : null
  const host = xfh?.split(',')[0]?.trim() ?? headers.get('host') ?? 'localhost'
  const proto =
    xfp?.split(',')[0]?.trim() ??
    (headers.get('x-real-proto') ?? 'http')

  return new URL(raw, `${proto}://${host}`)
}