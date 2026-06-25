export type FetchBody =
  | BodyInit
  | Record<string, unknown>
  | null
  | undefined

export interface FetchOptions {
  method?: string
  body?: FetchBody
  headers?: HeadersInit
  query?: Record<string, string | number | boolean | (string | number | boolean)[]>
  baseURL?: string
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer'
  onRequest?: (ctx: FetchRequestContext) => void | Promise<void>
  onResponse?: (ctx: FetchResponseContext) => void | Promise<void>
  onError?: (ctx: FetchErrorContext) => void | Promise<void>
}

export interface FetchRequestContext {
  request: Request
  options: FetchOptions
}

export interface FetchResponseContext extends FetchRequestContext {
  response: Response
}

export interface FetchErrorContext extends FetchRequestContext {
  error: FetchError
}

export class FetchError extends Error {
  status?: number
  statusText?: string
  data?: unknown
  response?: Response
  request?: Request
  constructor(message: string, opts: Partial<Omit<FetchError, 'message' | 'name'>> = {}) {
    super(message)
    this.name = 'FetchError'
    Object.assign(this, opts)
  }
}

interface Interceptor<C> {
  handlers: Array<(ctx: C) => void | Promise<void>>
  use(handler: (ctx: C) => void | Promise<void>): void
  clear(): void
}

function createInterceptor<C>(): Interceptor<C> {
  const handlers: Array<(ctx: C) => void | Promise<void>> = []
  return {
    handlers,
    use(handler) { handlers.push(handler) },
    clear() { handlers.length = 0 },
  }
}

const FALLBACK_BASE = 'http://localhost'

function buildUrl(
  url: string,
  baseURL: string | undefined,
  query: FetchOptions['query'],
): string {
  const fullUrl = new URL(url, baseURL ?? FALLBACK_BASE).toString()
  if (!query || Object.keys(query).length === 0) return fullUrl

  const parsed = new URL(fullUrl)
  for (const [k, v] of Object.entries(query)) {
    if (Array.isArray(v)) v.forEach((item) => parsed.searchParams.append(k, String(item)))
    else parsed.searchParams.set(k, String(v))
  }
  return parsed.toString()
}

function isPlainObject(body: unknown): body is Record<string, unknown> {
  return (
    typeof body === 'object' &&
    body !== null &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    !(body instanceof ReadableStream)
  )
}

function buildBody(body: unknown, headers: Headers): BodyInit | undefined {
  if (body == null) return undefined
  if (isPlainObject(body)) {
    if (!headers.has('content-type')) headers.set('content-type', 'application/json')
    return JSON.stringify(body)
  }
  return body as BodyInit
}

async function parseResponse<T>(
  response: Response,
  responseType: FetchOptions['responseType'],
): Promise<T> {
  if (responseType === 'text') return (await response.text()) as unknown as T
  if (responseType === 'blob') return (await response.blob()) as unknown as T
  if (responseType === 'arrayBuffer') return (await response.arrayBuffer()) as unknown as T
  if (response.status === 204) return undefined as T
  const ct = response.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) return (await response.json()) as T
  return (await response.text()) as unknown as T
}

export interface $Fetch {
  <T = unknown>(url: string, options?: FetchOptions): Promise<T>
  interceptors: {
    request: Interceptor<FetchRequestContext>
    response: Interceptor<FetchResponseContext>
    error: Interceptor<FetchErrorContext>
  }
}

export interface CreateFetchDefaults {
  baseURL?: string
  headers?: HeadersInit
}

export function createFetch(defaults?: CreateFetchDefaults): $Fetch {
  const requestInterceptors = createInterceptor<FetchRequestContext>()
  const responseInterceptors = createInterceptor<FetchResponseContext>()
  const errorInterceptors = createInterceptor<FetchErrorContext>()

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      requestInterceptors.clear()
      responseInterceptors.clear()
      errorInterceptors.clear()
    })
  }

  const fetchImpl = async <T = unknown>(
    url: string,
    options: FetchOptions = {},
  ): Promise<T> => {
    const method = (options.method ?? 'GET').toUpperCase()
    const headers = new Headers(defaults?.headers)
    if (options.headers) {
      new Headers(options.headers).forEach((v, k) => headers.set(k, v))
    }
    if (!headers.has('accept')) headers.set('accept', 'application/json')

    const finalUrl = buildUrl(
      url,
      options.baseURL ?? defaults?.baseURL,
      options.query,
    )
    const body = buildBody(options.body, headers)
    const request = new Request(finalUrl, { method, headers, body })

    const reqCtx: FetchRequestContext = { request, options }
    if (options.onRequest) await options.onRequest(reqCtx)
    for (const h of requestInterceptors.handlers) await h(reqCtx)

    let response: Response
    try {
      response = await fetch(request)
    } catch (err) {
      const error = new FetchError(
        err instanceof Error ? err.message : String(err),
        { request },
      )
      const errCtx: FetchErrorContext = { request, options, error }
      if (options.onError) await options.onError(errCtx)
      for (const h of errorInterceptors.handlers) await h(errCtx)
      throw error
    }

    if (!response.ok) {
      const error = new FetchError(
        `${method} ${finalUrl} → ${response.status} ${response.statusText}`,
        {
          status: response.status,
          statusText: response.statusText,
          response,
          data: await parseResponse(
            response,
            options.responseType ?? 'json',
          ).catch(() => undefined),
          request,
        },
      )
      const errCtx: FetchErrorContext = { request, options, error }
      if (options.onError) await options.onError(errCtx)
      for (const h of errorInterceptors.handlers) await h(errCtx)
      throw error
    }

    const resCtx: FetchResponseContext = { request, response, options }
    if (options.onResponse) await options.onResponse(resCtx)
    for (const h of responseInterceptors.handlers) await h(resCtx)

    return parseResponse<T>(response, options.responseType)
  }

  return Object.assign(fetchImpl, {
    interceptors: {
      request: requestInterceptors,
      response: responseInterceptors,
      error: errorInterceptors,
    },
  }) as $Fetch
}

export const $fetch = createFetch()