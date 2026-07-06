import {
  computed,
  getCurrentInstance,
  getCurrentScope,
  isRef,
  nextTick,
  onMounted,
  onScopeDispose,
  onServerPrefetch,
  ref,
  shallowRef,
  toValue,
  watch,
  type Ref,
  type WatchSource,
} from 'vue'
import { tryUseNuxeApp } from './app-context'
import type { NuxeApp } from '../plugins/runtime'
import type { NuxeSSRContext } from '../types/ssr-context'

export type AsyncDataKey = string | Ref<string> | (() => string)

export interface AsyncDataHandlerOptions {
  signal: AbortSignal
}

export type AsyncDataHandler<T> = (
  nuxeApp: NuxeApp,
  options: AsyncDataHandlerOptions,
) => Promise<T>

export interface UseAsyncDataOptions<T> {
  default?: () => T | Ref<T>
  server?: boolean
  lazy?: boolean
  retryCount?: number
  retryDelayMs?: number
  watch?: WatchSource | WatchSource[]
}

export interface UseAsyncDataReturn<T> {
  data: Ref<T | null>
  pending: Ref<boolean>
  error: Ref<Error | null>
  status: Ref<'idle' | 'pending' | 'success' | 'error'>
  refresh: () => Promise<void>
}

type Status = UseAsyncDataReturn<unknown>['status']['value']

let hydratedPayload: Record<string, unknown> | null = null

export function setHydratedPayload(payload: Record<string, unknown | null>): void {
  hydratedPayload = payload
}

function readHydrated<T>(key: string): T | undefined {
  return !hydratedPayload || !(key in hydratedPayload) ? undefined : hydratedPayload[key] as T
}

export function readHydratedKey<T = unknown>(key: string): T | undefined {
  if (!hydratedPayload || !(key in hydratedPayload)) return undefined
  return hydratedPayload[key] as T
}

function getSSRContext(): NuxeSSRContext | undefined {
  if (typeof window !== 'undefined') return undefined
  const nuxeApp = tryUseNuxeApp()
  if (nuxeApp?.ssrContext) return nuxeApp.ssrContext as NuxeSSRContext
  return (globalThis as { __NUXE_SSR_CONTEXT__?: NuxeSSRContext }).__NUXE_SSR_CONTEXT__
}

async function runWithRetries<T>(
  handler: AsyncDataHandler<T>,
  nuxeApp: NuxeApp,
  signal: AbortSignal,
  retries: number,
  delay: number,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await handler(nuxeApp, {signal})
    } catch (err) {
      lastError = err
      if (attempt < retries && delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

export function useAsyncData<T>(key: AsyncDataKey, handler: AsyncDataHandler<T>, options: UseAsyncDataOptions<T> = {}): UseAsyncDataReturn<T> {
  if (!key) throw new Error('[nuxe] useAsyncData: `key` is required')

  const isClient = typeof window !== 'undefined'
  const ssrContext = getSSRContext()
  const ssrDisabled = ssrContext?.routeRules?.ssr === false
  const runOnServer = !isClient && ssrContext !== undefined && options.server !== false && !ssrDisabled

  const keyRef = computed(() => toValue(key))

  const data = shallowRef<T | null>(null) as Ref<T | null>
  const pending = ref(!!options.lazy)
  const error = shallowRef<Error | null>(null)
  const status = ref<Status>('idle')

  const retries = Math.max(0, options.retryCount ?? 0)
  const retryDelay = Math.max(0, options.retryDelayMs ?? 0)

  const runHandler = async (currentKey: string): Promise<void> => {
    const nuxeApp = !isClient ? tryUseNuxeApp() : null
    const ctx = ssrContext
    const abortController = new AbortController()

    const exec = (): Promise<T> => {
      const callHandler = () => runWithRetries<T>(handler, nuxeApp as NuxeApp, abortController.signal, retries, retryDelay)
      return nuxeApp && !isClient ? nuxeApp.vueApp.runWithContext(callHandler) : callHandler()
    }

    try {
      const result = await exec()
      data.value = result
      status.value = 'success'
      if (ctx) ctx.payload[currentKey] = result
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      status.value = 'error'
      if (ctx) ctx.payload[currentKey] = {__error: error.value.message}
    } finally {
      pending.value = false
      if (ctx) ctx.pending.delete(currentKey)
    }
  }

  if (isClient) {
    if (options.lazy) {
      onMounted(() => {
        const hydrated = readHydrated<T>(keyRef.value)
        if (hydrated !== undefined) {
          if (hydrated !== null && typeof hydrated === 'object' && '__error' in hydrated) {
            error.value = new Error(String((hydrated as { __error: unknown }).__error))
            status.value = 'error'
          } else {
            data.value = hydrated
            status.value = 'success'
          }
          pending.value = false
        } else {
          status.value = 'pending'
          void runHandler(keyRef.value)
        }
      })
    } else {
      const hydrated = readHydrated<T>(keyRef.value)
      if (hydrated !== undefined) {
        if (hydrated !== null && typeof hydrated === 'object' && '__error' in hydrated) {
          error.value = new Error(String((hydrated as { __error: unknown }).__error))
          status.value = 'error'
        } else {
          data.value = hydrated
          status.value = 'success'
        }
      }
    }
  }

  if (data.value === null && options.default) {
    const d = options.default()
    data.value = (isRef(d) ? d.value : d) as T
  }

  if (status.value === 'idle' && runOnServer) {
    if (options.lazy) {
      const handlerPromise = runHandler(keyRef.value)
      if (ssrContext) ssrContext.pending.set(keyRef.value, handlerPromise)
    } else {
      pending.value = true
      status.value = 'pending'
      const handlerPromise = runHandler(keyRef.value)
      if (ssrContext) ssrContext.pending.set(keyRef.value, handlerPromise)
      if (getCurrentInstance()) {
        onServerPrefetch(() => handlerPromise)
      }
    }
  }

  if (status.value === 'idle' && isClient && !options.lazy) {
    pending.value = true
    status.value = 'pending'
    if (ssrContext) {
      ssrContext.pending.set(keyRef.value, runHandler(keyRef.value))
    } else {
      void runHandler(keyRef.value)
    }
  }

  if (isClient) {
    let keyChanging = false
    const hasScope = !!getCurrentScope()
    let stopKeyWatch: (() => void) | undefined
    let stopDepsWatch: (() => void) | undefined

    if (isRef(key) || typeof key === 'function') {
      stopKeyWatch = watch(keyRef, async (newKey, oldKey) => {
        if (oldKey === undefined) return
        if (newKey === oldKey) return
        keyChanging = true
        try {
          data.value = null
          error.value = null
          pending.value = true
          status.value = 'pending'
          await runHandler(newKey)
        } finally {
          await nextTick()
          keyChanging = false
        }
      }, {flush: 'sync'})
    }

    if (options.watch !== undefined) {
      stopDepsWatch = watch(options.watch, () => {
        if (keyChanging) return
        pending.value = true
        status.value = 'pending'
        if (ssrContext) {
          const p = runHandler(keyRef.value)
          ssrContext.pending.set(keyRef.value, p)
        } else {
          void runHandler(keyRef.value)
        }
      })
    }

    if (hasScope) {
      onScopeDispose(() => {
        stopKeyWatch?.()
        stopDepsWatch?.()
      })
    }
  }

  const refresh = async (): Promise<void> => {
    const nuxeApp = !isClient ? tryUseNuxeApp() : null
    const abortController = new AbortController()

    const exec = (): Promise<T> => {
      const callHandler = () => runWithRetries<T>(handler, nuxeApp as NuxeApp, abortController.signal, retries, retryDelay)
      return nuxeApp && !isClient
        ? nuxeApp.vueApp.runWithContext(callHandler)
        : callHandler()
    }

    pending.value = true
    status.value = 'pending'
    try {
      data.value = await exec()
      status.value = 'success'
      error.value = null
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      status.value = 'error'
    } finally {
      pending.value = false
    }
  }

  return {data, pending, error, status, refresh}
}