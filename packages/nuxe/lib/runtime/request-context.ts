import { getContext } from 'unctx'
import { inject, type App, type InjectionKey } from 'vue'
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

const nuxeContext = getContext<NuxeRequestContext>('nuxe', {
  asyncContext: import.meta.server,
})

export function getCurrentContext(): NuxeRequestContext | undefined {
  const fromUnctx = nuxeContext.tryUse()
  if (fromUnctx) return fromUnctx
  return inject(NUXE_REQUEST_CONTEXT_KEY, undefined)
}

export function provideRequestContext(app: App, ctx: NuxeRequestContext): void {
  app.provide(NUXE_REQUEST_CONTEXT_KEY, ctx)
  nuxeContext.set(ctx, true)
}

export function runWithContext<T>(
  ctx: NuxeRequestContext,
  fn: () => Promise<T>,
): Promise<T> {
  return nuxeContext.callAsync(ctx, fn)
}

export function runWithContextSync<T>(
  ctx: NuxeRequestContext,
  fn: () => T,
): T {
  return nuxeContext.call(ctx, fn)
}
