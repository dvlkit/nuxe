import { useNuxeApp } from '../plugins/runtime'

export function useRequestEvent(): Request | undefined {
  const nuxeApp = useNuxeApp()
  return nuxeApp.ssrContext?.request as Request | undefined
}

export function useRequestHeaders(): Record<string, string> {
  const event = useRequestEvent()
  if (!event) return {}
  const headers: Record<string, string> = {}
  event.headers.forEach((value, key) => {
    headers[key] = value
  })
  return headers
}
