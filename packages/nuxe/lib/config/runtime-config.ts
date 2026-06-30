export function camelToUpperSnake(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toUpperCase()
}

export const NUXE_RESERVED_ENV = new Set([
  'NUXE_SILENT',
  'NUXE_DEV',
  'NUXE_BASE_URL',
  'NUXE_VITE_NODE_OPTIONS',
])

export interface RuntimeConfig {
  public: Record<string, unknown>
  [key: string]: unknown
}

function isRuntimeConfigValue(value: unknown): value is RuntimeConfig | Record<string, unknown> | string | number | boolean | null | undefined {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true
  return typeof value === 'object' && !Array.isArray(value);

}

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

function applyEnvVar(config: RuntimeConfig, keys: string[], value: string): void {
  if (keys.length === 0) return

  const target: Record<string, unknown> = keys[0] === 'public' ? config.public : config
  const path = keys[0] === 'public' ? keys.slice(1) : keys

  if (path.length === 0) return

  let current: Record<string, unknown> = target
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if (!(key in current) || !isRuntimeConfigValue(current[key]) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }

  const lastKey = path[path.length - 1]
  const raw = value
  if (raw === 'true') {
    current[lastKey] = true
  } else if (raw === 'false') {
    current[lastKey] = false
  } else if (/^-?\d+$/.test(raw)) {
    current[lastKey] = Number(raw)
  } else {
    current[lastKey] = raw
  }
}

export function injectRuntimeConfigFromEnv(target: RuntimeConfig): void {
  for (const [envName, envValue] of Object.entries(process.env)) {
    if (envValue === undefined) continue
    const path = nuxeEnvToPath(envName)
    if (path === null) continue
    applyEnvVar(target, path, envValue)
  }
}

function collectKeys(prefix: string, obj: unknown, keys: string[] = []): Array<{ keys: string[], value: unknown }> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return [{ keys, value: obj }]
  }
  const result: Array<{ keys: string[], value: unknown }> = []
  for (const [key, value] of Object.entries(obj)) {
    result.push(...collectKeys(prefix, value, [...keys, key]))
  }
  return result
}

export function resolveRuntimeConfig(config: RuntimeConfig = { public: {} }): RuntimeConfig {
  const resolved: RuntimeConfig = {
    public: config.public ? { ...config.public } : {},
  }
  for (const [key, value] of Object.entries(config)) {
    if (key === 'public') continue
    resolved[key] = isRuntimeConfigValue(value) && typeof value === 'object' && value !== null
      ? { ...(value as Record<string, unknown>) }
      : value
  }

  // Pass 1: override declared keys from NUXE_* / NUXE_PUBLIC_* env vars.
  // Supports nested paths (e.g. `public.api.timeout` -> NUXE_PUBLIC_API_TIMEOUT).
  const envKeys = collectKeys('', resolved)
  for (const { keys } of envKeys) {
    if (keys.length === 0) continue
    const prefix = keys[0] === 'public' ? 'NUXE_PUBLIC_' : 'NUXE_'
    const envKey = `${prefix}${keys.slice(keys[0] === 'public' ? 1 : 0).map(camelToUpperSnake).join('_')}`
    const envValue = process.env[envKey]
    if (envValue !== undefined) {
      applyEnvVar(resolved, keys, envValue)
    }
  }

  // Pass 2: auto-inject env vars that have no matching declared key.
  injectRuntimeConfigFromEnv(resolved)

  return resolved
}

export function getPublicRuntimeConfig(config: RuntimeConfig): RuntimeConfig {
  return { public: config.public }
}

