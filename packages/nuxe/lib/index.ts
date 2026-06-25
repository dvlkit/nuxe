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
  type FetchOptions,
  type CreateFetchDefaults,
  type FetchRequestContext,
  type FetchResponseContext,
  type FetchErrorContext,
} from './runtime/fetch'