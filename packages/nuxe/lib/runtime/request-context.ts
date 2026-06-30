import { getCurrentInstance, inject, type App, type InjectionKey } from 'vue'
import type { NuxeState } from './state'
import type { NuxeApp } from '../plugins/runtime'
import type { RouteRules } from '../pages/scanner'

export interface NuxeRequestContext {
  payload: Record<string, unknown>
  pending: Map<string, Promise<unknown>>
  state?: NuxeState
  nuxeApp?: NuxeApp
  awaitAll(): Promise<void>
  routeRules?: RouteRules
}

export function createRequestContext(): NuxeRequestContext {
  const payload: Record<string, unknown> = {}
  const pending = new Map<string, Promise<unknown>>()
  return {
    payload,
    pending,
    state: {},
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
    $nuxe?: NuxeApp
  }
}