import { describe, expect, it } from 'vitest'
import { createSSRApp, defineComponent } from 'vue'
import { createNuxtApp } from '../../lib/plugins/runtime'
import { createNuxtState, useState } from '../../lib/runtime/state'

describe('createNuxtState', () => {
  it('creates refs from initial values', () => {
    const state = createNuxtState({ counter: 1 })
    expect(state.counter.value).toBe(1)
  })
})

describe('useState', () => {
  it('returns a shared ref for the same key', () => {
    const app = createSSRApp(defineComponent({ render: () => null }))
    const state = createNuxtState()
    createNuxtApp({
      vueApp: app,
      router: {} as any,
      config: { public: {} },
      state,
    })

    let a = null as ReturnType<typeof useState> | null
    let b = null as ReturnType<typeof useState> | null
    app.runWithContext(() => {
      a = useState('counter', () => 0)
      b = useState('counter', () => 100)
    })

    expect(a).toBe(b)
    expect(a!.value).toBe(0)
  })

  it('hydrates from initial state', () => {
    const app = createSSRApp(defineComponent({ render: () => null }))
    const state = createNuxtState({ user: 'luis' })
    createNuxtApp({
      vueApp: app,
      router: {} as any,
      config: { public: {} },
      state,
    })

    let user = null as ReturnType<typeof useState<string>> | null
    app.runWithContext(() => {
      user = useState('user', () => 'default')
    })

    expect(user!.value).toBe('luis')
  })
})
