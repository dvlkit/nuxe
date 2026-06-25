import { shallowRef, watch, type Ref, type WatchSource } from 'vue'
import {
  $fetch,
  type FetchContext,
  type FetchOptions,
  type FetchResponse,
} from 'ofetch'
import {
  useAsyncData,
  type UseAsyncDataOptions,
  type UseAsyncDataReturn,
} from './use-async-data'

// Error shape exposed via the onError hook. `.status` / `.statusText` /
// `.response` are populated only for non-OK responses; for network failures
// (where ofetch throws the underlying fetch error) they're undefined.
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

  const userOnResponse = options.onResponse
  const userOnError = options.onError

  async function runHook<C>(hook: unknown, ctx: C): Promise<void> {
    if (!hook) return
    if (Array.isArray(hook)) {
      for (const h of hook) await (h as (c: C) => void | Promise<void>)(ctx)
    } else {
      await (hook as (c: C) => void | Promise<void>)(ctx)
    }
  }

  const handler = async (): Promise<T> => {
    const resolvedUrl = typeof url === 'string' ? url : url()
    return await $fetch<T>(resolvedUrl, {
      ...options,
      onResponse: async (ctx: FetchContext & { response: FetchResponse<T> }) => {
        statusCode.value = ctx.response.status
        await runHook(userOnResponse, ctx as never)
      },
      onRequestError: async (ctx: FetchContext & { error: Error }) => {
        statusCode.value = null
        if (userOnError) await userOnError({ error: ctx.error as UseFetchError })
      },
      onResponseError: async (ctx: FetchContext & { response: FetchResponse<T> }) => {
        statusCode.value = ctx.response.status
        if (userOnError) {
          // Build a synthetic Error with status/statusText/response attached,
          // since the real FetchError isn't constructed until ofetch's onError
          // throws (which happens AFTER our hook fires).
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
  })

  if (typeof url === 'function') {
    watch(url, () => { void asyncResult.refresh() })
  }

  if (options.watch && options.watch.length > 0) {
    watch(options.watch, () => { void asyncResult.refresh() }, { deep: true })
  }

  return {
    ...asyncResult,
    statusCode,
  }
}