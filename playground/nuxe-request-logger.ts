import { logRequest } from '@dvlkit/nuxe/utils/logger'

export default function (nitroApp) {
  const originalFetch = nitroApp.fetch
  nitroApp.fetch = async (request) => {
    const start = Date.now()
    const response = await originalFetch(request)
    try {
      const url = new URL(request.url, 'http://localhost')
      const method = request.method || 'GET'
      const status = response.status
      if (url.pathname.startsWith('/@') ||
          url.pathname.startsWith('/node_modules/') ||
          url.pathname.startsWith('/__vite_ping') ||
          url.pathname.startsWith('/__open-in-editor')) {
        return response
      }
      logRequest(method, url.pathname + url.search, status, Date.now() - start)
    } catch {
    }
    return response
  }
}
