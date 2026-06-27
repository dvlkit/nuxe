import { describe, expect, it, vi } from 'vitest'
import type { App, Router } from 'vue'
import { createSSRApp, defineComponent } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createNuxtApp, defineNuxtPlugin, defineNuxePlugin, runPlugins } from '../../lib/plugins/runtime'
import type { NuxtPlugin } from '../../lib/plugins/runtime'

function createTestApp(): { app: App; router: Router } {
  const app = createSSRApp(defineComponent({ render: () => null }))
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: defineComponent({ render: () => null }) }],
  })
  return { app, router }
}

describe('createNuxtApp', () => {
  it('exposes vueApp, router and config', () => {
    const { app, router } = createTestApp()
    const nuxtApp = createNuxtApp({ vueApp: app, router, config: { public: {} } })
    expect(nuxtApp.vueApp).toBe(app)
    expect(nuxtApp.router).toBe(router)
    expect(nuxtApp.config).toEqual({ public: {} })
  })

  it('calls registered hooks', async () => {
    const { app, router } = createTestApp()
    const nuxtApp = createNuxtApp({ vueApp: app, router, config: { public: {} } })
    const fn = vi.fn()
    nuxtApp.hook('app:created', fn)
    await nuxtApp.callHook('app:created')
    expect(fn).toHaveBeenCalledOnce()
  })
})

describe('defineNuxtPlugin', () => {
  it('returns the plugin unchanged', () => {
    const plugin = () => {}
    expect(defineNuxtPlugin(plugin)).toBe(plugin)
  })

  it('defineNuxePlugin is an alias', () => {
    const plugin = () => {}
    expect(defineNuxePlugin(plugin)).toBe(plugin)
  })
})

describe('runPlugins', () => {
  it('runs function plugins with nuxtApp', async () => {
    const { app, router } = createTestApp()
    const nuxtApp = createNuxtApp({ vueApp: app, router, config: { public: {} } })
    const plugin = vi.fn()
    await runPlugins([plugin], nuxtApp)
    expect(plugin).toHaveBeenCalledWith(nuxtApp)
  })

  it('runs object plugins using setup', async () => {
    const { app, router } = createTestApp()
    const nuxtApp = createNuxtApp({ vueApp: app, router, config: { public: {} } })
    const setup = vi.fn()
    await runPlugins([{ setup }], nuxtApp)
    expect(setup).toHaveBeenCalledWith(nuxtApp)
  })

  it('awaits async plugins', async () => {
    const { app, router } = createTestApp()
    const nuxtApp = createNuxtApp({ vueApp: app, router, config: { public: {} } })
    let resolved = false
    const plugin: NuxtPlugin = async () => {
      await Promise.resolve()
      resolved = true
    }
    await runPlugins([plugin], nuxtApp)
    expect(resolved).toBe(true)
  })
})
