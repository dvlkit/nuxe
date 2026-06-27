import { getCurrentInstance, inject, provide, ref, type App, type InjectionKey, type Ref } from 'vue'
import { useRouter } from 'vue-router'

export interface NuxtErrorPayload {
  statusCode?: number
  statusMessage?: string
  message?: string
  description?: string
  data?: unknown
}

const NUXE_ERROR_KEY: InjectionKey<Ref<NuxtError | null>> = Symbol('@dvlkit/nuxe/error')

export class NuxtError extends Error {
  readonly statusCode: number
  readonly statusMessage: string
  readonly description?: string
  readonly data?: unknown

  constructor(payload: NuxtErrorPayload = {}) {
    super(payload.message || payload.statusMessage || 'An error occurred')
    this.name = 'NuxtError'
    this.statusCode = payload.statusCode || 500
    this.statusMessage = payload.statusMessage || 'Internal Server Error'
    this.description = payload.description
    this.data = payload.data
  }
}

export function isNuxtError(err: unknown): err is NuxtError {
  return (
    err instanceof NuxtError ||
    (typeof err === 'object' &&
      err !== null &&
      (err as Error).name === 'NuxtError' &&
      typeof (err as NuxtError).statusCode === 'number')
  )
}

export function serializeError(err: unknown): NuxtErrorPayload | null {
  if (!isNuxtError(err)) return null
  return {
    statusCode: err.statusCode,
    statusMessage: err.statusMessage,
    message: err.message,
    description: err.description,
    data: err.data,
  }
}

export function deserializeError(payload: NuxtErrorPayload): NuxtError {
  return new NuxtError(payload)
}

export function createError(payload: NuxtErrorPayload | string | Error): NuxtError {
  if (payload instanceof NuxtError) return payload
  if (typeof payload === 'string') return new NuxtError({ statusMessage: payload })
  if (payload instanceof Error) {
    return new NuxtError({
      message: payload.message,
      statusMessage: 'Internal Server Error',
      statusCode: 500,
    })
  }
  return new NuxtError(payload)
}

export function showError(err: NuxtErrorPayload | string | Error): never {
  const nuxtError = createError(err)
  const instance = getCurrentInstance()
  if (instance) {
    const errorRef = instance.appContext.app.runWithContext(() => inject(NUXE_ERROR_KEY, null))
    if (errorRef) {
      errorRef.value = nuxtError
    }
  }
  throw nuxtError
}

export function useError(): Ref<NuxtError | null> {
  return inject(NUXE_ERROR_KEY, ref(null))
}

export function provideError(app: App, error: Ref<NuxtError | null>): void {
  app.provide(NUXE_ERROR_KEY, error)
}

export function clearError(options: { redirect?: string } = {}): void {
  const error = useError()
  error.value = null
  if (options.redirect) {
    const router = useRouter()
    void router.push(options.redirect)
  }
}
