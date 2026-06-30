import type { Ref } from 'vue'
import { isRef, ref } from 'vue'
import { tryUseNuxeApp } from './app-context'

export type NuxeState = Record<string, Ref<unknown>>

export function useState<T>(key: string, init?: () => T): Ref<T> {
  if (!key || typeof key !== 'string') {
    throw new TypeError(`[nuxe] [useState] key must be a non-empty string: ${String(key)}`)
  }
  if (init !== undefined && typeof init !== 'function') {
    throw new Error(`[nuxe] [useState] init must be a function: ${String(init)}`)
  }

  const app = tryUseNuxeApp()
  if (!app) {
    throw new Error(
      '[nuxe] useState() must be called inside a Nuxe plugin or setup function, '
      + 'or inside a runWithContext that has provided an app via provideNuxeApp().',
    )
  }

  const payload = app.payload as { state?: NuxeState }
  if (!payload.state) {
    payload.state = {}
  }
  const state = payload.state

  if (!(key in state)) {
    state[key] = ref(init ? init() : undefined) as unknown as Ref
  }
  return state[key] as Ref<T>
}

export function createNuxeState(initial: Record<string, unknown> = {}): NuxeState {
  const state: NuxeState = {}
  for (const [key, value] of Object.entries(initial)) {
    state[key] = isRef(value) ? value : (ref(value) as unknown as Ref)
  }
  return state
}

export function clearNuxeState(
  keys?: string | string[] | ((key: string) => boolean),
): void {
  const app = tryUseNuxeApp()
  if (!app) return
  const state = app.payload.state
  if (!state) return
  const allKeys = Object.keys(state)
  if (!keys) {
    for (const k of allKeys) delete state[k]
    return
  }
  const predicate =
    typeof keys === 'function'
      ? keys
      : Array.isArray(keys)
        ? (k: string) => keys.includes(k)
        : (k: string) => keys === k
  for (const k of allKeys) {
    if (predicate(k)) delete state[k]
  }
}
