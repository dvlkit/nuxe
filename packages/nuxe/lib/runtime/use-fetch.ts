import {
  isRef,
  reactive,
  shallowRef,
  toValue,
  watch,
  type MultiWatchSources,
  type Ref,
  type WatchSource,
} from 'vue'
import {
  $fetch,
  type FetchContext,
  type FetchOptions,
  type FetchResponse,
} from 'ofetch'
import {
  useAsyncData,
  readHydratedKey,
  type UseAsyncDataOptions,
  type UseAsyncDataReturn,
} from './use-async-data'
import { getCurrentContext } from './request-context'
import { useBaseURL } from './base-url'

const REF_OR_GETTER_OPTIONS = [
  'method',
  'baseURL',
  'query',
  'params',
  'body',
  'headers',
] as const

export interface UseFetchError extends Error {
  status?: number
  statusText?: string
  response?: Response
}

export interface UseFetchOptions<T = any> extends FetchOptions<'json', T>, UseAsyncDataOptions<T> {
  key?: string
  watch?: WatchSource[]
  onError?: (ctx: { error: UseFetchError }) => void | Promise<void>
}

export interface UseFetchReturn<T> extends UseAsyncDataReturn<T> {
  statusCode: Ref<number | null>
}

function resolveServerBaseURL(explicit: unknown): string | undefined {
  if (typeof window !== 'undefined') return toValue(explicit) as string | undefined
  const v = toValue(explicit) as string | undefined
  if (v) return v
  // Priority:
  //   1. `runtimeConfig.app.baseURL` from `nuxe.config.ts` (provided via
  //      `provideBaseURL` to the Vue app).
  //   2. `process.env.NUXE_BASE_URL` (set by the CLI at startup).
  //   3. `http://localhost:3000` so the request still produces a valid URL.
  return (
    useBaseURL()
    ?? process.env.NUXE_BASE_URL
    ?? 'http://localhost:3000'
  )
}

async function runHook<C>(hook: unknown, ctx: C): Promise<void> {
  if (!hook) return
  if (Array.isArray(hook)) {
    for (const h of hook) await (h as (c: C) => void | Promise<void>)(ctx)
  } else {
    await (hook as (c: C) => void | Promise<void>)(ctx)
  }
}

function deepUnwrapRefs<T>(value: T): T {
  if (isRef(value)) return value.value as T
  if (Array.isArray(value)) return value.map((v) => deepUnwrapRefs(v)) as T
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = deepUnwrapRefs(v)
    }
    return result as T
  }
  return value
}

export function useFetch<T = unknown>(
  url: string | (() => string),
  options: UseFetchOptions<T> = {},
): UseFetchReturn<T> {
  let key: string
  if (typeof url === 'string') {
    key = options.key ?? url
  } else {
    if (!options.key) {
      throw new Error('[nuxe] useFetch: `options.key` is required when url is a function')
    }
    key = options.key
  }

  const statusCode = shallowRef<number | null>(null)

  if (typeof window !== 'undefined') {
    const ssStatus = readHydratedKey<number | null>(`${key}::__statusCode`)
    if (typeof ssStatus === 'number') {
      statusCode.value = ssStatus
    }
  }

  const userOnResponse = options.onResponse
  const userOnError = options.onError

  const _options = reactive(options as UseFetchOptions<T>)

  const ssrCtx = getCurrentContext()

  const handler = async (): Promise<T> => {
    const resolvedUrl = typeof url === 'string' ? url : url()

    const callOptions: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(_options)) {
      callOptions[k] = v
    }
    for (const key of REF_OR_GETTER_OPTIONS) {
      if (key in callOptions) {
        callOptions[key] = deepUnwrapRefs(toValue(callOptions[key]))
      }
    }

    return await $fetch<T>(resolvedUrl, {
      ...(callOptions as UseFetchOptions<T>),
      retry: (callOptions.retry as number | false | undefined) ?? 0,
      baseURL: resolveServerBaseURL(callOptions.baseURL),
      onResponse: async (ctx: FetchContext & { response: FetchResponse<T> }) => {
        statusCode.value = ctx.response.status
        if (ssrCtx) ssrCtx.payload[`${key}::__statusCode`] = ctx.response.status
        await runHook(userOnResponse, ctx as never)
      },
      onRequestError: async (ctx: FetchContext & { error: Error }) => {
        statusCode.value = null
        if (ssrCtx) ssrCtx.payload[`${key}::__statusCode`] = null
        if (userOnError) await userOnError({ error: ctx.error as UseFetchError })
      },
      onResponseError: async (ctx: FetchContext & { response: FetchResponse<T> }) => {
        statusCode.value = ctx.response.status
        if (ssrCtx) ssrCtx.payload[`${key}::__statusCode`] = ctx.response.status
        if (userOnError) {
          const err = new Error(`${ctx.response.status} ${ctx.response.statusText}`) as UseFetchError
          err.status = ctx.response.status
          err.statusText = ctx.response.statusText
          err.response = ctx.response
          await userOnError({ error: err })
        }
      },
    })
  }

  const asyncResult = useAsyncData<T>(key, handler, {
    default: options.default,
    server: options.server,
    retryCount: options.retryCount,
    retryDelayMs: options.retryDelayMs,
  })

  if (typeof url === 'function') {
    watch(url, () => { void asyncResult.refresh() })
  }

  const watchSources: MultiWatchSources = [
    ...(options.watch ?? []),
    _options,
  ]
  watch(watchSources, () => {
    void asyncResult.refresh()
  })

  return {
    ...asyncResult,
    statusCode,
  }
}