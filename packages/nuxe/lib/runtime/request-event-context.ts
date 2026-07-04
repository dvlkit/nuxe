import { getContext } from 'unctx'

const requestEventContext = getContext<Request>('nuxe-request-event', {
  asyncContext: import.meta.server
})

export function getCurrentRequest(): Request | undefined {
  const fromUnctx = requestEventContext.tryUse()
  if (fromUnctx) return fromUnctx
  return undefined
}

export function runWithRequest<T>(
  request: Request,
  fn: () => Promise<T>,
): Promise<T> {
  return requestEventContext.callAsync(request, fn)
}