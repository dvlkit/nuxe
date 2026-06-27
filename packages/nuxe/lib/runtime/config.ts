import { getCurrentInstance, inject, type App, type InjectionKey } from 'vue'

export interface RuntimeConfig {
  public: Record<string, unknown>
  [key: string]: unknown
}

const NUXE_RUNTIME_CONFIG_KEY: InjectionKey<RuntimeConfig> = Symbol('@dvlkit/nuxe/runtime-config')

export function useRuntimeConfig(): RuntimeConfig {
  const instance = getCurrentInstance()
  if (instance) {
    return instance.appContext.app.runWithContext(() =>
      inject(NUXE_RUNTIME_CONFIG_KEY, { public: {} }),
    )
  }
  return inject(NUXE_RUNTIME_CONFIG_KEY, { public: {} })
}

export function provideRuntimeConfig(app: App, config: RuntimeConfig): void {
  app.provide(NUXE_RUNTIME_CONFIG_KEY, config)
}
