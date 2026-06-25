import { isRef, ref, type Ref, shallowRef } from 'vue'
import { getCurrentContext } from './request-context'

export interface UseAsyncDataOptions<T> {
  default?: () => T | Ref<T>
  server?: boolean
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
  if (!hydratedPayload || !(key in hydratedPayload)) return undefined
  return hydratedPayload[key] as T
}

export function useAsyncData<T>(key: string, handler: () => Promise<T>, options: UseAsyncDataOptions<T> = {}): UseAsyncDataReturn<T> {
  if (!key) throw new Error('[nuxe] useAsyncData: `key` is required')

  const isClient = typeof window !== 'undefined'
  const ctx = getCurrentContext()
  const runOnServer = !isClient && ctx !== undefined && options.server !== false

  const data = shallowRef<T | null>(null) as Ref<T | null>
  const pending = ref(false)
  const error = shallowRef<Error | null>(null)
  const status = ref<Status>('idle')

  if (isClient) {
    const hydrated = readHydrated<T>(key)
    if (hydrated !== undefined) {
      data.value = hydrated
      status.value = 'success'
    }
  }

  if (data.value === null && options.default) {
    const d = options.default()
    data.value = (isRef(d) ? d.value : d) as T
  }

  if (status.value !== 'success' && (runOnServer || isClient)) {
    pending.value = true
    status.value = 'pending'

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

    if (ctx) {
      ctx.pending.set(key, runHandler())
    } else {
      void runHandler()
    }
  }

  const refresh = async (): Promise<void> => {
    pending.value = true
    status.value = 'pending'
    error.value = null
    try {
      data.value = await handler()
      status.value = 'success'
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      status.value = 'error'
    } finally {
      pending.value = false
    }
  }

  return {data, pending, error, status, refresh}
}