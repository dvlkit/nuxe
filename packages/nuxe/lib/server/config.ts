import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  resolveRuntimeConfig,
  type RuntimeConfig,
} from '../config/runtime-config'

let cached: RuntimeConfig | undefined

export function loadRuntimeConfig(): RuntimeConfig {
  if (cached) return cached
  try {
    const raw = readFileSync(
      join(process.cwd(), '.nuxe', 'runtime-config.json'),
      'utf-8',
    )
    cached = resolveRuntimeConfig(JSON.parse(raw) as RuntimeConfig)
  } catch {
    cached = resolveRuntimeConfig({ public: {} })
  }
  return cached
}

export function resetRuntimeConfigCache(): void {
  cached = undefined
}
