import { hasInjectionContext, inject, type App, type InjectionKey } from 'vue'
import type { RuntimeConfig } from '../config/runtime-config'

export type { RuntimeConfig }

const NUXE_RUNTIME_CONFIG_KEY: InjectionKey<RuntimeConfig> =
  Symbol('@dvlkit/nuxe/runtime-config')

const EMPTY: RuntimeConfig = { public: {} }

export function useRuntimeConfig(): RuntimeConfig {
  if (hasInjectionContext()) {
    return inject(NUXE_RUNTIME_CONFIG_KEY, EMPTY)
  }
  return EMPTY
}

export function provideRuntimeConfig(app: App, config: RuntimeConfig): void {
  app.provide(NUXE_RUNTIME_CONFIG_KEY, config)
}
