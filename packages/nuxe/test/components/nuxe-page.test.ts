// @vitest-environment happy-dom
import { nextTick, defineComponent, h, createApp, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { NuxePage, createNuxeApp, createNuxeState } from '../../lib'
import { getHookListenerCount } from '../../lib/plugins/runtime'
import { isCurrentNavigationResolved, markCurrentNavigationResolved } from '../../lib/runtime/page-loading'

const Page = defineComponent({
  name: 'PlainPage',
  setup() {
    return () => h('div', 'page')
  },
})

describe('NuxePage page:start listener', () => {
  it('removes the listener on unmount and does not duplicate it after remount', async () => {
    const show = ref(true)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: Page }],
    })
    const app = createApp({
      name: 'NuxePageHarness',
      setup() {
        return () => (show.value ? h(NuxePage) : null)
      },
    })
    const nuxeApp = createNuxeApp({
      vueApp: app,
      router,
      config: { public: {} },
      state: createNuxeState(),
    })
    app.use(router)
    await router.push('/')
    const el = document.createElement('div')
    document.body.appendChild(el)
    app.mount(el)
    await nextTick()
    expect(getHookListenerCount(nuxeApp, 'page:start')).toBe(1)

    show.value = false
    await nextTick()
    expect(getHookListenerCount(nuxeApp, 'page:start')).toBe(0)
    markCurrentNavigationResolved(nuxeApp)
    await nuxeApp.callHook('page:start')
    expect(isCurrentNavigationResolved(nuxeApp)).toBe(true)

    show.value = true
    await nextTick()
    expect(getHookListenerCount(nuxeApp, 'page:start')).toBe(1)
    markCurrentNavigationResolved(nuxeApp)
    await nuxeApp.callHook('page:start')
    expect(isCurrentNavigationResolved(nuxeApp)).toBe(false)
    expect(getHookListenerCount(nuxeApp, 'page:start')).toBe(1)

    show.value = false
    await nextTick()
    expect(getHookListenerCount(nuxeApp, 'page:start')).toBe(0)

    app.unmount()
    el.remove()
  })
})
