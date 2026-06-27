export function camelToUpperSnake(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toUpperCase()
}

export interface RuntimeConfig {
  public: Record<string, unknown>
  [key: string]: unknown
}

function isRuntimeConfigValue(value: unknown): value is RuntimeConfig | Record<string, unknown> | string | number | boolean | null | undefined {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true
  return typeof value === 'object' && !Array.isArray(value);

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

  const envKeys = collectKeys('', resolved)
  for (const { keys } of envKeys) {
    const envKey = keys.length === 0 ? '' : `NUXE_${keys.map(camelToUpperSnake).join('_')}`
    if (!envKey) continue
    const envValue = process.env[envKey]
    if (envValue !== undefined) {
      applyEnvVar(resolved, keys, envValue)
    }
  }

  const publicEnvKeys = collectKeys('', resolved.public)
  for (const { keys } of publicEnvKeys) {
    const envKey = keys.length === 0 ? '' : `NUXE_PUBLIC_${keys.map(camelToUpperSnake).join('_')}`
    if (!envKey) continue
    const envValue = process.env[envKey]
    if (envValue !== undefined) {
      applyEnvVar(resolved, ['public', ...keys], envValue)
    }
  }

  return resolved
}

export function getPublicRuntimeConfig(config: RuntimeConfig): RuntimeConfig {
  return { public: config.public }
}
