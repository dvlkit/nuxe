import { defineEventHandler, getCookie } from '@dvlkit/nuxe/server'

export default defineEventHandler((event) => {
  const session = getCookie(event, 'session')
  return {
    session: session ?? null,
    hasCookie: !!session,
    ts: Date.now(),
  }
})
