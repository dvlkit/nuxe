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
export { useAsyncData, setHydratedPayload, type UseAsyncDataOptions, type UseAsyncDataReturn } from './runtime'
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