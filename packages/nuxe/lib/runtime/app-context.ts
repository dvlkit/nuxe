import { hasInjectionContext, inject, type InjectionKey } from 'vue'
import type { NuxeApp } from '../plugins/runtime'
import type { NuxeSSRContext } from '../types/ssr-context'

export const NUXE_APP_INJECTION_KEY: InjectionKey<NuxeApp> =
  Symbol.for('@dvlkit/nuxe-app') as unknown as InjectionKey<NuxeApp>

export function tryUseNuxeApp(): NuxeApp | null {
  if (hasInjectionContext()) {
    const fromInject = inject(NUXE_APP_INJECTION_KEY, undefined)
    if (fromInject) return fromInject
  }
  if (typeof window === 'undefined') {
    const fromSSR = (globalThis as { __NUXE_SSR_CONTEXT__?: NuxeSSRContext })
      .__NUXE_SSR_CONTEXT__
    if (fromSSR?.nuxeApp) return fromSSR.nuxeApp
  }
  return null
}