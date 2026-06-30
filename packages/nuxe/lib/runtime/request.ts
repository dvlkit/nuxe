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
