/// <reference path="./virtual-modules.d.ts" />

export { defineConfig, type NuxeConfig, type NuxeConfigInput } from './config/define-config'
export { useHead } from '@unhead/vue'
export * from './head'
export {
  defineNuxeRouteMiddleware,
  navigateTo,
  abortNavigation,
  type RouteMiddleware,
  type NavigateToOptions,
  type AbortNavigationOptions
} from './middleware/runtime'
export { definePage, type PageMeta } from './pages/runtime'
export {
  useAsyncData,
  setHydratedPayload,
  type UseAsyncDataOptions,
  type UseAsyncDataReturn,
} from './runtime'
export {
  createError,
  isNuxeError,
  serializeError,
  deserializeError,
  showError,
  useError,
  clearError,
  type NuxeError,
  type NuxeErrorPayload,
} from './runtime/error'
export {
  createRequestContext,
  runWithContext,
  getCurrentContext,
  provideRequestContext,
  type NuxeRequestContext,
} from './runtime/request-context'
export {
  $fetch,
  createFetch,
  FetchError,
  type $Fetch,
  type CreateFetchOptions,
  type FetchOptions,
  type FetchContext,
  type FetchResponse,
  type FetchRequest,
} from './runtime/fetch'
export { useFetch, type UseFetchOptions, type UseFetchReturn, type UseFetchError } from './runtime/use-fetch'
export { provideBaseURL, useBaseURL, resetBaseURLCache } from './runtime/base-url'
export {
  useRuntimeConfig,
  provideRuntimeConfig,
  type RuntimeConfig,
} from './runtime/config'
export {
  defineNuxePlugin,
  createNuxeApp,
  provideNuxeApp,
  runPlugins,
  useNuxeApp,
  tryUseNuxeApp,
  type NuxeApp,
  type NuxePlugin,
  type NuxeAppHooks,
} from './plugins/runtime'
export { useLoadingIndicator, type LoadingIndicator } from './runtime/use-loading-indicator'
export { default as NuxeLoadingIndicator } from './components/nuxe-loading-indicator'
export { useState, createNuxeState, clearNuxeState, type NuxeState } from './runtime/state'
export { useCookie, parseCookieValue, serializeCookie, type CookieOptions } from './runtime/cookie'
export { useRequestEvent, useRequestHeaders, useRequestURL } from './runtime/request'
