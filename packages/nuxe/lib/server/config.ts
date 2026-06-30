import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  resolveRuntimeConfig,
  injectRuntimeConfigFromEnv,
  NUXE_RESERVED_ENV,
  camelToUpperSnake,
  type RuntimeConfig,
} from '../config/runtime-config'

export {
  resolveRuntimeConfig,
  injectRuntimeConfigFromEnv,
  NUXE_RESERVED_ENV,
  camelToUpperSnake,
}

export function loadRuntimeConfig(): RuntimeConfig {
  let raw: string
  try {
    raw = readFileSync(
      join(process.cwd(), '.nuxe', 'runtime-config.json'),
      'utf-8',
    )
  } catch {
    raw = '{}'
  }

  let parsed: RuntimeConfig
  try {
    parsed = JSON.parse(raw) as RuntimeConfig
  } catch {
    parsed = { public: {} }
  }

  return resolveRuntimeConfig(parsed)
}


