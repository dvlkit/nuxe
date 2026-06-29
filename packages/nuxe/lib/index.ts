/// <reference path="./virtual-modules.d.ts" />

export { default } from './plugin'
export { defineConfig, type NuxeConfig, type NuxeConfigInput, type LoadNuxeConfigOptions } from './config'
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
  isNuxtError,
  serializeError,
  deserializeError,
  showError,
  useError,
  clearError,
  type NuxtError,
  type NuxtErrorPayload,
} from './runtime/error'
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
export {
  useRuntimeConfig,
  provideRuntimeConfig,
  loadRuntimeConfig,
  type RuntimeConfig,
} from './runtime/config'
export {
  defineNuxtPlugin,
  defineNuxePlugin,
  createNuxtApp,
  runPlugins,
  useNuxtApp,
  type NuxtApp,
  type NuxtPlugin,
  type NuxtAppHooks,
} from './plugins/runtime'
export { useLoadingIndicator, type LoadingIndicator } from './runtime/use-loading-indicator'
export { default as NuxtLoadingIndicator } from './components/nuxt-loading-indicator'
export { useState, createNuxtState, provideNuxtState, type NuxtState } from './runtime/state'
export { useCookie, parseCookieValue, serializeCookie, type CookieOptions } from './runtime/cookie'
export { useRequestEvent, useRequestHeaders } from './runtime/request'
