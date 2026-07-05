import { hasInjectionContext, inject, type InjectionKey } from 'vue'
import type { NuxeApp } from '../plugins/runtime'
import { getContext } from 'unctx'

export const NUXE_APP_INJECTION_KEY: InjectionKey<NuxeApp> =
  Symbol.for('@dvlkit/nuxe-app') as unknown as InjectionKey<NuxeApp>

export const nuxeAppContext = getContext<NuxeApp>('nuxe-app', {
  asyncContext: import.meta.server,
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
