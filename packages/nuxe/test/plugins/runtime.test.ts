import { describe, expect, it, vi } from 'vitest'
import type { App, Router } from 'vue'
import { createSSRApp, defineComponent } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createNuxeApp, createNuxeState, defineNuxePlugin, provideNuxeApp, runPlugins, useNuxeApp } from '../../lib'
import { createRequestContext, runWithContext } from '../../lib/runtime'
import type { NuxePlugin } from '../../lib'

function createTestApp(): { app: App; router: Router } {
  const app = createSSRApp(defineComponent({ render: () => null }))
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: defineComponent({ render: () => null }) }],
  })
  return { app, router }
}

describe('createNuxeApp', () => {
  it('exposes vueApp, router and config', () => {
    const { app, router } = createTestApp()
    const nuxeApp = createNuxeApp({ vueApp: app, router, config: { public: {} } })
    expect(nuxeApp.vueApp).toBe(app)
    expect(nuxeApp.router).toBe(router)
    expect(nuxeApp.config).toEqual({ public: {} })
  })

  it('calls registered hooks', async () => {
    const { app, router } = createTestApp()
    const nuxeApp = createNuxeApp({ vueApp: app, router, config: { public: {} } })
    const fn = vi.fn()
    nuxeApp.hook('app:created', fn)
    await nuxeApp.callHook('app:created')
    expect(fn).toHaveBeenCalledOnce()
  })

  it('provides nuxeApp for useNuxeApp', () => {
    const { app, router } = createTestApp()
    const nuxeApp = createNuxeApp({ vueApp: app, router, config: { public: {} } })
    let injected = null as typeof nuxeApp | null
    app.runWithContext(() => {
      injected = useNuxeApp()
    })
    expect(injected).toBe(nuxeApp)
  })
})

describe('defineNuxePlugin', () => {
  it('returns the plugin unchanged', () => {
    const plugin = () => {}
    expect(defineNuxePlugin(plugin)).toBe(plugin)
  })

  it('defineNuxePlugin is an alias', () => {
    const plugin = () => {}
    expect(defineNuxePlugin(plugin)).toBe(plugin)
  })
})

describe('runPlugins', () => {
  it('runs function plugins with nuxeApp', async () => {
    const { app, router } = createTestApp()
    const nuxeApp = createNuxeApp({ vueApp: app, router, config: { public: {} } })
    const plugin = vi.fn()
    await runPlugins([plugin], nuxeApp)
    expect(plugin).toHaveBeenCalledWith(nuxeApp)
  })

  it('runs object plugins using setup', async () => {
    const { app, router } = createTestApp()
    const nuxeApp = createNuxeApp({ vueApp: app, router, config: { public: {} } })
    const setup = vi.fn()
    await runPlugins([{ setup }], nuxeApp)
    expect(setup).toHaveBeenCalledWith(nuxeApp)
  })

  it('awaits async plugins', async () => {
    const { app, router } = createTestApp()
    const nuxeApp = createNuxeApp({ vueApp: app, router, config: { public: {} } })
    let resolved = false
    const plugin: NuxePlugin = async () => {
      await Promise.resolve()
      resolved = true
    }
    await runPlugins([plugin], nuxeApp)
    expect(resolved).toBe(true)
  })
})

describe('useNuxeApp in async contexts (Nuxt-style fallback)', () => {
  it('falls back to NuxeRequestContext.nuxeApp when there is no Vue context', async () => {
    const { app, router } = createTestApp()
    const nuxeApp = createNuxeApp({
      vueApp: app,
      router,
      config: { public: {} },
      state: createNuxeState(),
    })

    const ctx = createRequestContext()
    provideNuxeApp(ctx, nuxeApp)

    let resolved = null as typeof nuxeApp | null
    await runWithContext(ctx, async () => {
      await Promise.resolve()
      resolved = useNuxeApp()
    })

    expect(resolved).toBe(nuxeApp)
  })
})
