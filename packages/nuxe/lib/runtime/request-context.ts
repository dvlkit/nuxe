import { getCurrentInstance, inject, type App, type InjectionKey } from 'vue'

export interface NuxeRequestContext {
  payload: Record<string, unknown>
  pending: Map<string, Promise<unknown>>
  awaitAll(): Promise<void>
}

export function createRequestContext(): NuxeRequestContext {
  const payload: Record<string, unknown> = {}
  const pending = new Map<string, Promise<unknown>>()
  return {
    payload,
    pending,
    async awaitAll() {
      if (pending.size === 0) return
      await Promise.allSettled(pending.values())
    },
  }
}

const NUXE_REQUEST_CONTEXT_KEY: InjectionKey<NuxeRequestContext> =
  Symbol.for('@dvlkit/nuxe/request-context') as InjectionKey<NuxeRequestContext>

let _moduleCtx: NuxeRequestContext | undefined

export function getCurrentContext(): NuxeRequestContext | undefined {
  const injected = inject(NUXE_REQUEST_CONTEXT_KEY, undefined)
  if (injected !== undefined) return injected
  const app = getCurrentInstance()?.appContext?.app as
    | (App & { $nuxe?: NuxeRequestContext })
    | null
  if (app?.$nuxe !== undefined) return app.$nuxe
  return _moduleCtx
}

export function provideRequestContext(app: App, ctx: NuxeRequestContext): void {
  app.provide(NUXE_REQUEST_CONTEXT_KEY, ctx)
  ;(app as App & { $nuxe?: NuxeRequestContext }).$nuxe = ctx
}

export async function runWithContext<T>(
  ctx: NuxeRequestContext,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = _moduleCtx
  _moduleCtx = ctx
  try {
    return await fn()
  } finally {
    _moduleCtx = prev
  }
}

declare module 'vue' {
  interface App {
    $nuxe?: NuxeRequestContext
  }
}