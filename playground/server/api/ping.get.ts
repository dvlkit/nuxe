import { defineEventHandler, getQuery, setResponseStatus } from '@dvlkit/nuxe/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  if (query.delay) {
    await new Promise((resolve) => setTimeout(resolve, Number(query.delay)))
  }

  const status = query.status ? Number(query.status) : 200
  if (status >= 400) {
    setResponseStatus(event, status)
    return { message: `Error ${status}`, timestamp: Date.now() }
  }

  return {
    message: 'pong',
    timestamp: Date.now(),
    query: typeof query.q === 'string' ? query.q : null,
  }
})