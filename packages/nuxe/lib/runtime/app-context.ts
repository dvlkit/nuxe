import { hasInjectionContext, inject, type InjectionKey } from 'vue'
import type { NuxeApp } from '../plugins/runtime'
import { getContext } from 'unctx'

type AsyncLocalStorageCtor = new <T>() => {
  getStore(): T | undefined
  run<R>(store: T, callback: () => R): R
}
const AsyncLocalStorage: AsyncLocalStorageCtor | undefined = (globalThis as Record<string, unknown>)
  .AsyncLocalStorage as AsyncLocalStorageCtor | undefined

export const NUXE_APP_INJECTION_KEY: InjectionKey<NuxeApp> =
  Symbol.for('@dvlkit/nuxe-app') as unknown as InjectionKey<NuxeApp>

const nuxeAppContext = getContext<NuxeApp>('nuxe-app', {
  asyncContext: true,
  AsyncLocalStorage: AsyncLocalStorage as unknown as Parameters<typeof getContext>[1] extends { AsyncLocalStorage?: infer A } ? A : never,
})

export function tryUseNuxeApp(): NuxeApp | null {
  const fromUnctx = nuxeAppContext.tryUse()
  if (fromUnctx) return fromUnctx
  if (hasInjectionContext()) {
    const fromInject = inject(NUXE_APP_INJECTION_KEY, undefined)
    if (fromInject) return fromInject
  }
  return null
}

export function setNuxeApp(nuxeApp: NuxeApp | undefined): void {
  nuxeAppContext.set(nuxeApp, true)
}
