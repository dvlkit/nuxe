import { getCurrentInstance, isRef, onMounted, onServerPrefetch, ref, type Ref, shallowRef } from 'vue'
import { getCurrentContext } from './request-context'

export interface UseAsyncDataOptions<T> {
  default?: () => T | Ref<T>
  server?: boolean
  lazy?: boolean
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

export function readHydratedKey<T = unknown>(key: string): T | undefined {
  if (!hydratedPayload || !(key in hydratedPayload)) return undefined
  return hydratedPayload[key] as T
}

function readHydrated<T>(key: string): T | undefined {
  return !hydratedPayload || !(key in hydratedPayload) ? undefined : hydratedPayload[key] as T
}

export function useAsyncData<T>(key: string, handler: () => Promise<T>, options: UseAsyncDataOptions<T> = {}): UseAsyncDataReturn<T> {
  if (!key) throw new Error('[nuxe] useAsyncData: `key` is required')

  const isClient = typeof window !== 'undefined'
  const ctx = getCurrentContext()
  const runOnServer = !isClient && ctx !== undefined && options.server !== false

  const data = shallowRef<T | null>(null) as Ref<T | null>
  const pending = ref(!!options.lazy)
  const error = shallowRef<Error | null>(null)
  const status = ref<Status>('idle')

  const runHandler = async (): Promise<void> => {
    try {
      const result = await handler()
      data.value = result
      status.value = 'success'
      if (ctx) ctx.payload[key] = result
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      status.value = 'error'
      if (ctx) ctx.payload[key] = {__error: error.value.message}
    } finally {
      pending.value = false
      if (ctx) ctx.pending.delete(key)
    }
  }

  if (isClient) {
    if (options.lazy) {
      onMounted(() => {
        const hydrated = readHydrated<T>(key)
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
          void runHandler()
        }
      })
    } else {
      const hydrated = readHydrated<T>(key)
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
      const handlerPromise = runHandler()
      if (ctx) ctx.pending.set(key, handlerPromise)
    } else {
      pending.value = true
      status.value = 'pending'
      const handlerPromise = runHandler()
      if (ctx) ctx.pending.set(key, handlerPromise)
      if (getCurrentInstance()) {
        onServerPrefetch(() => handlerPromise)
      }
    }
  }

  if (status.value === 'idle' && isClient && !options.lazy) {
    pending.value = true
    status.value = 'pending'
    if (ctx) {
      ctx.pending.set(key, runHandler())
    } else {
      void runHandler()
    }
  }

  const refresh = async (): Promise<void> => {
    pending.value = true
    status.value = 'pending'
    try {
      data.value = await handler()
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