import { definePlugin } from 'nitro'
import { getRequestURL } from 'h3'
import type { HTTPEvent, H3Event } from 'h3'
import { logRequest } from '../utils/logger'

function methodOf(event: HTTPEvent): string {
  return (event.req.method ?? 'GET').toUpperCase()
}

declare module 'h3' {
  interface H3EventContext {
    __nuxeStartedAt?: number
  }
}

const ASSET_RE =
  /\.(?:css|js|mjs|map|png|jpe?g|gif|svg|webp|avif|woff2?|ico|json|xml|txt|mp4|webm|ogg|wav|mp3|pdf|zip)(?:\?.*)?$/i

function classify(
  url: string,
  contentType: string | null,
  status: number,
): string | undefined {
  if (status >= 500) return 'error'
  if (ASSET_RE.test(url)) return 'asset'
  if (url.startsWith('/api/') || url.startsWith('/_')) return 'api'
  if (contentType && contentType.includes('text/html')) return 'page'
  return 'api'
}

function fullPath(event: HTTPEvent): string {
  const u = getRequestURL(event)
  return u.pathname + u.search
}

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event: HTTPEvent) => {
    ;(event as H3Event).context.__nuxeStartedAt = performance.now()
  })

  nitroApp.hooks.hook('response', (res: Response, event: HTTPEvent) => {
    const h3Event = event as H3Event
    const startedAt = h3Event.context.__nuxeStartedAt
    if (typeof startedAt !== 'number') return

    const durationMs = Math.round(performance.now() - startedAt)
    const url = fullPath(event)
    const method = methodOf(event)
    const status = res.status
    const contentType = res.headers.get('content-type')
    const label = classify(url, contentType, status)

    logRequest(method, url, status, durationMs, label)
  })

  nitroApp.hooks.hook('error', (error, ctx) => {
    const event = ctx.event as H3Event | undefined
    if (!event) return

    const url = fullPath(event)
    const method = methodOf(event)
    logRequest(method, url, 500, 0, 'error', error.message)
  })
})
