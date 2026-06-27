import { inject, type App, type InjectionKey, type Ref, ref } from 'vue'

export type NuxtState = Record<string, Ref<unknown>>

const NUXT_STATE_KEY: InjectionKey<NuxtState> = Symbol('@dvlkit/nuxt-state')

export function createNuxtState(initial: Record<string, unknown> = {}): NuxtState {
  const state: NuxtState = {}
  for (const key in initial) {
    state[key] = ref(initial[key])
  }
  return state
}

export function provideNuxtState(app: App, state: NuxtState): void {
  app.provide(NUXT_STATE_KEY, state)
}

export function useState<T>(key: string, init?: () => T): Ref<T> {
  const state = inject(NUXT_STATE_KEY)
  if (!state) {
    throw new Error('[nuxt] useState() must be called inside a Nuxt app.')
  }
  if (!(key in state)) {
    state[key] = ref(init ? init() : undefined) as Ref<unknown>
  }
  return state[key] as Ref<T>
}
