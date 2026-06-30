import { describe, expect, it, beforeEach } from 'vitest'
import { createSSRApp, defineComponent } from 'vue'
import {
  createRequestContext,
  createNuxeApp,
  createNuxeState,
  provideNuxeState,
  resetNuxeStateCache,
  runWithContext,
  useAsyncData,
  useState,
  type NuxeState,
} from '../../lib'

describe('createNuxeState', () => {
  it('creates refs from initial values', () => {
    const state = createNuxeState({ counter: 1 })
    expect(state.counter.value).toBe(1)
  })
})

describe('useState (Vue context)', () => {
  it('returns a shared ref for the same key', () => {
    const app = createSSRApp(defineComponent({ render: () => null }))
    const state = createNuxeState()
    createNuxeApp({
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
    const state = createNuxeState({ user: 'luis' })
    createNuxeApp({
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

describe('useState (async context)', () => {
  beforeEach(() => {
    resetNuxeStateCache()
  })

  it('finds state across Vue-context and module-level fallback', () => {
    const state: NuxeState = createNuxeState({ counter: 7 })

    provideNuxeState({ provide: () => undefined } as never, state)

    const a = useState('counter', () => 999)
    expect(a.value).toBe(7)
  })

  it('persists across useAsyncData handlers (the Luis case)', async () => {
    const state: NuxeState = createNuxeState({ session: undefined })
    provideNuxeState({ provide: () => undefined } as never, state)

    const ctx = createRequestContext()
    const composed = await runWithContext(ctx, async () => {
      const r = await useAsyncData('session-via-handler', async () => {
        const sessionRef = useState<string | undefined>('session', () => 'seeded')
        return { session: sessionRef.value }
      })
      await ctx.awaitAll()
      return r
    })

    expect(composed.data.value).toEqual({ session: 'seeded' })
  })

  it('throws a clear error when called outside any context', () => {
    resetNuxeStateCache()
    expect(() => useState('orphan', () => 0)).toThrow(
      /\[nuxe\] useState/,
    )
  })
})
