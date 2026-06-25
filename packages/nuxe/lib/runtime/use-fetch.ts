import { shallowRef, watch, type Ref, type WatchSource } from 'vue'
import { $fetch, type FetchOptions } from './fetch'
import {
  useAsyncData,
  type UseAsyncDataOptions,
  type UseAsyncDataReturn,
} from './use-async-data'

export interface UseFetchOptions<T> extends FetchOptions, UseAsyncDataOptions<T> {
  key?: string
  watch?: WatchSource[]
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

  const handler = async (): Promise<T> => {
    const resolvedUrl = typeof url === 'string' ? url : url()
    return await $fetch<T>(resolvedUrl, {
      ...options,
      onResponse: async (ctx) => {
        statusCode.value = ctx.response.status
        if (userOnResponse) await userOnResponse(ctx)
      },
      onError: async (ctx) => {
        statusCode.value = ctx.error.status ?? null
        if (userOnError) await userOnError(ctx)
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