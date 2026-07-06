import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getCurrentRequestMock = vi.fn()
const fetchWithEventMock = vi.fn()

vi.mock('h3', () => ({
  fetchWithEvent: fetchWithEventMock,
}))

vi.mock('../../lib/runtime/request-event-context', () => ({
  getCurrentRequest: getCurrentRequestMock,
}))

import installInternalFetch from '../../lib/server/install-internal-fetch'

describe('installInternalFetch', () => {
  const originalFetch = globalThis.fetch
  const originalEnv = process.env.NUXE_DEBUG_REQUEST

  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = vi.fn() as typeof globalThis.fetch
    process.env.NUXE_DEBUG_REQUEST = '1'
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    if (typeof originalEnv === 'undefined') delete process.env.NUXE_DEBUG_REQUEST
    else process.env.NUXE_DEBUG_REQUEST = originalEnv
  })

  it('logs proxied headers before forwarding fetchWithEvent', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const requestHeaders = new Headers({ cookie: 'sid=abc', 'x-request-id': '123' })
    const request = new Request('https://example.com/api/me', { headers: requestHeaders })

    getCurrentRequestMock.mockReturnValue(request)
    fetchWithEventMock.mockResolvedValue(new Response('ok'))

    installInternalFetch({ fetch: vi.fn() } as never)

    await globalThis.fetch('/api/me', { headers: { authorization: 'Bearer token' } })

    expect(fetchWithEventMock).toHaveBeenCalledTimes(1)
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[nuxe-debug] pre-fetchWithEvent',
      expect.objectContaining({
        url: '/api/me',
        proxyHeaders: expect.objectContaining({ cookie: 'sid=abc', 'x-request-id': '123' }),
        initHeaders: expect.objectContaining({ authorization: 'Bearer token' }),
      }),
    )
  })
})
