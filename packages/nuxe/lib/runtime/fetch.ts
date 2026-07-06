import {
  $fetch as ofetchRaw,
  createFetch as ofetchCreateFetch,
  FetchError,
  type $Fetch,
  type CreateFetchOptions,
  type FetchContext,
  type FetchOptions,
  type FetchResponse,
  type FetchRequest,
} from 'ofetch'
import { toValue } from 'vue'
import { useBaseURL } from './base-url'
import { NuxeSSRContext } from '../types/ssr-context'

export function resolveBaseURL(explicit?: unknown): string {
  const v = explicit !== undefined ? toValue(explicit) as string | undefined : undefined
  if (v) return v
  if (typeof window !== 'undefined') {
    return window.location?.origin ?? ''
  }

  const ssrContext = (globalThis as { __NUXE_SSR_CONTEXT__?: NuxeSSRContext }).__NUXE_SSR_CONTEXT__
  if (ssrContext?.request) {
    try {
      return new URL(ssrContext.request.url).origin
    } catch {
    }
  }
  return useBaseURL() ?? process.env.NUXE_BASE_URL ?? 'http://localhost:3000'
}

function defaultBaseURL(): string {
  if (typeof window !== 'undefined') {
    return window.location?.origin ?? ''
  }
  return process.env.NUXE_BASE_URL ?? 'http://localhost:3000'
}

function isAbsoluteHttpUrl(url: unknown): boolean {
  return typeof url === 'string' && /^https?:\/\//i.test(url)
}

export const $fetch: $Fetch = ((url: unknown, options?: FetchOptions) => {
  const opts = (options ?? {}) as { baseURL?: string } & Record<string, unknown>
  const baseURL =
    opts.baseURL
    ?? (isAbsoluteHttpUrl(url) ? undefined : defaultBaseURL())
  return ofetchRaw(url as never, {
    ...opts,
    baseURL,
  } as never)
}) as $Fetch

export { FetchError }
export type { $Fetch, CreateFetchOptions, FetchContext, FetchOptions, FetchResponse, FetchRequest }

export const createFetch = ofetchCreateFetch
