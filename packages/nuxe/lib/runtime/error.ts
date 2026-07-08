import { getCurrentInstance, inject, provide, ref, type App, type InjectionKey, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { HTTPError, type ErrorInput } from 'h3'

export interface NuxeErrorPayload {
  statusCode?: number
  statusMessage?: string
  message?: string
  description?: string
  data?: unknown
}

const NUXE_ERROR_KEY: InjectionKey<Ref<NuxeError | null>> = Symbol('@dvlkit/nuxe/error')

export class NuxeError extends HTTPError {
  readonly description?: string

  constructor(payload: NuxeErrorPayload = {}) {
    super(payload.message ?? payload.statusMessage ?? 'An error occurred', {
      status: payload.statusCode,
      statusText: payload.statusMessage,
      data: payload.data,
    } satisfies ErrorInput)
    this.description = payload.description
  }
}

export function isNuxeError(err: unknown): err is NuxeError {
  return err instanceof NuxeError
}

export function serializeError(err: unknown): NuxeErrorPayload | null {
  if (!isNuxeError(err)) return null
  return {
    statusCode: err.status,
    statusMessage: err.statusText,
    message: err.message,
    description: err.description,
    data: err.data,
  }
}

export function deserializeError(payload: NuxeErrorPayload): NuxeError {
  return new NuxeError(payload)
}

export function createError(payload: NuxeErrorPayload | string | Error): NuxeError {
  if (payload instanceof NuxeError) return payload
  if (typeof payload === 'string') return new NuxeError({ statusMessage: payload })
  if (payload instanceof Error) {
    return new NuxeError({
      message: payload.message,
      statusMessage: 'Internal Server Error',
      statusCode: 500,
    })
  }
  return new NuxeError(payload)
}

export function showError(err: NuxeErrorPayload | string | Error): never {
  const nuxeError = createError(err)
  const instance = getCurrentInstance()
  if (instance) {
    const errorRef = instance.appContext.app.runWithContext(() => inject(NUXE_ERROR_KEY, null))
    if (errorRef) {
      errorRef.value = nuxeError
    }
  }
  throw nuxeError
}

export function useError(): Ref<NuxeError | null> {
  return inject(NUXE_ERROR_KEY, ref(null))
}

export function provideError(app: App, error: Ref<NuxeError | null>): void {
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
