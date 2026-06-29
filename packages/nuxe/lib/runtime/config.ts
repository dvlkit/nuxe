import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { hasInjectionContext, inject, type App, type InjectionKey } from 'vue'
import {
  resolveRuntimeConfig as resolveConfig,
  type RuntimeConfig,
} from '../config/runtime-config'

export type { RuntimeConfig }

const NUXE_RUNTIME_CONFIG_KEY: InjectionKey<RuntimeConfig> =
  Symbol('@dvlkit/nuxe/runtime-config')

let cachedServerConfig: RuntimeConfig | undefined

export function loadRuntimeConfig(): RuntimeConfig {
  if (cachedServerConfig) return cachedServerConfig
  try {
    const raw = readFileSync(
      join(process.cwd(), '.nuxe', 'runtime-config.json'),
      'utf-8',
    )
    cachedServerConfig = resolveConfig(JSON.parse(raw) as RuntimeConfig)
  } catch {
    cachedServerConfig = resolveConfig({ public: {} })
  }
  return cachedServerConfig
}

export function resetRuntimeConfigCache(): void {
  cachedServerConfig = undefined
}

export function useRuntimeConfig(): RuntimeConfig {
  if (hasInjectionContext()) {
    return inject(NUXE_RUNTIME_CONFIG_KEY, loadRuntimeConfig())
  }
  return loadRuntimeConfig()
}

export function provideRuntimeConfig(app: App, config: RuntimeConfig): void {
  app.provide(NUXE_RUNTIME_CONFIG_KEY, config)
}
