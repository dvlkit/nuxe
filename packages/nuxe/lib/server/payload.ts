import { uneval } from 'devalue'

const DANGEROUS_PAYLOAD_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function sanitizePayloadValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return value
  seen.add(value)

  if (
    value instanceof Date ||
    value instanceof RegExp ||
    value instanceof URL ||
    value instanceof Error
  ) {
    return value
  }

  if (value instanceof Map) {
    const map = new Map<unknown, unknown>()
    for (const [k, v] of value) {
      const safeKey = typeof k === 'string' && DANGEROUS_PAYLOAD_KEYS.has(k) ? '__sanitized__' : k
      map.set(safeKey, sanitizePayloadValue(v, seen))
    }
    return map
  }

  if (value instanceof Set) {
    const set = new Set<unknown>()
    for (const v of value) {
      set.add(sanitizePayloadValue(v, seen))
    }
    return set
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayloadValue(item, seen))
  }

  const result: Record<string, unknown> = {}
  for (const key of Object.keys(value)) {
    if (DANGEROUS_PAYLOAD_KEYS.has(key)) continue
    result[key] = sanitizePayloadValue((value as Record<string, unknown>)[key], seen)
  }
  return result
}

export function serializePayload(payload: Record<string, unknown>): string {
  const sanitized = sanitizePayloadValue({ data: payload }, new WeakSet()) as {
    data: Record<string, unknown>
  }
  return uneval(sanitized).replace(/</g, '\\u003c')
}
