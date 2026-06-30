import { hasInjectionContext, inject, ref, type App, type InjectionKey, type Ref } from 'vue'
import { getCurrentContext } from './request-context'

export type NuxeState = Record<string, Ref<unknown>>

const NUXE_STATE_KEY: InjectionKey<NuxeState> = Symbol('@dvlkit/nuxe-state')

let _moduleState: NuxeState | null = null

export function createNuxeState(initial: Record<string, unknown> = {}): NuxeState {
  const state: NuxeState = {}
  for (const key in initial) {
    state[key] = ref(initial[key])
  }
  return state
}

export function provideNuxeState(app: App, state: NuxeState): void {
  app.provide(NUXE_STATE_KEY, state)

  _moduleState = state
}

function resolveState(): NuxeState | null {
  let state: NuxeState | null = null
  if (hasInjectionContext()) {
    state = inject(NUXE_STATE_KEY, null)
  }
  if (!state) {
    const ctx = getCurrentContext()
    const ctxState = (ctx as { state?: NuxeState } | null | undefined)?.state
    if (ctxState) state = ctxState
  }
  if (!state) state = _moduleState
  return state
}

export function useState<T>(key: string, init?: () => T): Ref<T> {
  const state = resolveState()
  if (!state) {
    throw new Error(
      '[nuxe] useState() must be called inside a Vue setup, a nuxe request context, '
      + 'or after `provideNuxeState()` has run.',
    )
  }
  if (!(key in state)) {
    state[key] = ref(init ? init() : undefined) as Ref<unknown>
  }
  return state[key] as Ref<T>
}

export function resetNuxeStateCache(): void {
  _moduleState = null
}
