import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RuntimeConfig } from '../config/runtime-config'

const NUXE_RESERVED_ENV = new Set([
  'NUXE_SILENT',
  'NUXE_DEV',
  'NUXE_BASE_URL',
  'NUXE_VITE_NODE_OPTIONS',
])

function camelFromSnake(snake: string): string {
  return snake
    .toLowerCase()
    .split('_')
    .map((part, i) =>
      i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join('')
}

function nuxeEnvToPath(envName: string): string[] | null {
  if (!envName.startsWith('NUXE_')) return null
  if (NUXE_RESERVED_ENV.has(envName)) return null

  const publicPrefix = 'NUXE_PUBLIC_'
  if (envName.startsWith(publicPrefix)) {
    const sub = envName.slice(publicPrefix.length)
    if (!sub) return null
    return ['public', camelFromSnake(sub)]
  }

  const sub = envName.slice('NUXE_'.length)
  if (!sub) return null
  return [camelFromSnake(sub)]
}

function applyEnvVar(
  config: RuntimeConfig,
  keys: string[],
  value: string,
): void {
  if (keys.length === 0) return
  const target: Record<string, unknown> =
    keys[0] === 'public' ? config.public : config
  const path = keys[0] === 'public' ? keys.slice(1) : keys
  if (path.length === 0) return

  let current: Record<string, unknown> = target
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    const next = current[key]
    if (next == null || typeof next !== 'object' || Array.isArray(next)) {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }

  const lastKey = path[path.length - 1]
  if (value === 'true') current[lastKey] = true
  else if (value === 'false') current[lastKey] = false
  else if (/^-?\d+$/.test(value)) current[lastKey] = Number(value)
  else current[lastKey] = value
}

function injectRuntimeConfigFromEnv(target: RuntimeConfig): void {
  for (const [envName, envValue] of Object.entries(process.env)) {
    if (envValue === undefined) continue
    const path = nuxeEnvToPath(envName)
    if (path === null) continue
    applyEnvVar(target, path, envValue)
  }
}

export function resolveRuntimeConfig(
  config: RuntimeConfig = { public: {} },
): RuntimeConfig {
  const resolved: RuntimeConfig = {
    public: config.public ? { ...config.public } : {},
  }
  for (const [key, value] of Object.entries(config)) {
    if (key === 'public') continue
    resolved[key] = typeof value === 'object' && value !== null && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>) }
      : value
  }

  injectRuntimeConfigFromEnv(resolved)

  return resolved
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
