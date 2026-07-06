import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createSSRApp, defineComponent } from 'vue'
import {
  clearNuxeState,
  createNuxeApp,
  createNuxeState,
  tryUseNuxeApp,
  useAsyncData,
  useNuxeApp,
  useState,
} from '../../lib'
import type { NuxeSSRContext } from '../../lib/types/ssr-context'

function makeApp(initial?: Record<string, unknown>) {
  const app = createSSRApp(defineComponent({render: () => null}))
  const ssrContext: NuxeSSRContext = {
    url: '/',
    request: new Request('http://localhost/'),
    modules: new Set<string>(),
    payload: {},
    pending: new Map(),
    async awaitAll() {
      if (this.pending.size === 0) return
      await Promise.allSettled(this.pending.values())
    }
  }
  const state = createNuxeState(initial ?? {})
  const nuxeApp = createNuxeApp({
    vueApp: app,
    router: {} as any,
    config: {public: {}},
    ssrContext,
    state,
  })
  ;(globalThis as { __NUXE_SSR_CONTEXT__?: NuxeSSRContext }).__NUXE_SSR_CONTEXT__ = ssrContext
  return { app, state, nuxeApp, ssrContext }
}

afterEach(() => {
  delete (globalThis as { __NUXE_SSR_CONTEXT__?: NuxeSSRContext }).__NUXE_SSR_CONTEXT__
})

describe('createNuxeState', () => {
  it('creates refs from initial values', () => {
    const state = createNuxeState({counter: 1})
    expect(state.counter.value).toBe(1)
  })
})

describe('useState (Vue context)', () => {
  it('returns a shared ref for the same key', () => {
    const {app} = makeApp()

    let a: ReturnType<typeof useState> | null = null
    let b: ReturnType<typeof useState> | null = null
    app.runWithContext(() => {
      a = useState('counter', () => 0)
      b = useState('counter', () => 100)
    })

    expect(a).toBe(b)
    expect(a!.value).toBe(0)
  })

  it('hydrates from initial state', () => {
    const {app} = makeApp({user: 'luis'})

    let user: ReturnType<typeof useState<string>> | null = null
    app.runWithContext(() => {
      user = useState('user', () => 'default')
    })

    expect(user!.value).toBe('luis')
  })
})

describe('useState (async context)', () => {
  beforeEach(() => {
    clearNuxeState()
  })

  it('reads state created in setup() from inside a useAsyncData handler', async () => {
    const { app, nuxeApp } = makeApp()

    const result = await app.runWithContext(async () => {
      const resolved = useNuxeApp()
      expect(resolved).toBe(nuxeApp)

      return await useAsyncData('session-via-handler', async () => {
        const sessionRef = useState<string | undefined>('session', () => 'seeded')
        return {session: sessionRef.value}
      })
    })

    expect(result.data.value).toEqual({session: 'seeded'})
  })

  it('throws a clear error when called outside any context', () => {
    delete (globalThis as { __NUXE_SSR_CONTEXT__?: NuxeSSRContext }).__NUXE_SSR_CONTEXT__
    expect(tryUseNuxeApp()).toBeNull()
    clearNuxeState()

    expect(() => useState('orphan', () => 0)).toThrow(
      /\[nuxe\] useState/,
    )
  })

  it('clearing the state bag wipes entries', () => {
    const {app} = makeApp({counter: 7, name: 'luis'})
    app.runWithContext(() => {
      useState('extra', () => 'added')
      expect(useState('counter').value).toBe(7)
      clearNuxeState()
      expect(useState('counter').value).toBeUndefined()
      expect(useState('counter').value).toBeUndefined()
    })
  })

  it('clearing a subset only removes matching keys', () => {
    const {app} = makeApp({keep: 1, drop: 2})
    app.runWithContext(() => {
      expect(useState('keep').value).toBe(1)
      expect(useState('drop').value).toBe(2)
      clearNuxeState('drop')
      expect(useState('keep').value).toBe(1)
      expect(useState('drop').value).toBeUndefined()
    })
  })
})
