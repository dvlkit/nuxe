// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { nextTick, defineComponent, h, createApp, type App } from 'vue'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { NuxePage, createNuxeApp, createNuxeState, createPageScrollBehavior, type NuxeApp } from '../../lib'
import { NUXE_ENTRY_CLIENT } from '../../lib/plugin'

const readme = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../../README.md'), 'utf8')

let scrollX = 0
let scrollY = 0
const scrollCalls: Array<{ left?: number; top?: number }> = []
const trace: string[] = []

function installScroll() {
  scrollX = 0
  scrollY = 0
  scrollCalls.length = 0
  trace.length = 0
  Object.defineProperty(window, 'scrollX', { configurable: true, get: () => scrollX })
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY })
  window.scrollTo = ((...args: unknown[]) => {
    const arg = args[0]
    const next = typeof arg === 'object' && arg !== null
      ? arg as { left?: number; top?: number }
      : { left: args[0] as number, top: args[1] as number }
    if (typeof next.left === 'number') scrollX = next.left
    if (typeof next.top === 'number') scrollY = next.top
    scrollCalls.push({ left: next.left, top: next.top })
    trace.push(`scroll:${next.top ?? ''}`)
  }) as typeof window.scrollTo
}

function setScroll(top: number) {
  scrollX = 0
  scrollY = top
}

function setLocation(pathname: string) {
  const happy = (window as Window & { happyDOM?: { setURL: (url: string) => void } }).happyDOM
  if (happy) {
    happy.setURL(`http://localhost:3000${pathname}`)
    return
  }
  window.history.replaceState(null, '', pathname)
}

async function flushScroll() {
  for (let i = 0; i < 6; i++) {
    await nextTick()
    await new Promise<void>((resolveFrame) => {
      setTimeout(resolveFrame, 0)
    })
  }
}

function syncPage(name: string) {
  return defineComponent({
    name,
    setup() {
      return () => h('main', { style: 'height:4000px' }, name)
    },
  })
}

function createAsyncPage(gate: Promise<void>) {
  return defineComponent({
    name: 'AsyncPage',
    async setup() {
      await gate
      return () => h('main', { style: 'height:4000px' }, 'async')
    },
  })
}

function deferred() {
  let resolveGate: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    resolveGate = resolve
  })
  return { gate, resolveGate }
}

async function mountPages(routes: RouteRecordRaw[]) {
  setLocation('/')
  installScroll()
  let nuxeApp!: NuxeApp
  const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior: createPageScrollBehavior(() => nuxeApp, 'auto'),
  })
  const app = createApp({
    name: 'ScrollHarness',
    setup() {
      return () => h(NuxePage)
    },
  })
  nuxeApp = createNuxeApp({
    vueApp: app,
    router,
    config: { public: {} },
    state: createNuxeState(),
  })
  nuxeApp.hook('page:loading:end', () => {
    trace.push('page:loading:end')
  })
  router.beforeEach(() => nuxeApp.callHook('page:start'))
  router.beforeEach(() => nuxeApp.callHook('page:loading:start'))
  router.afterEach(() => nuxeApp.callHook('page:finish'))
  const el = document.createElement('div')
  document.body.appendChild(el)
  app.use(router)
  await router.isReady()
  app.mount(el)
  await flushScroll()
  return { app, router, nuxeApp, el }
}

async function unmount(app: App, el: HTMLElement) {
  app.unmount()
  el.remove()
}

describe('NuxePage scroll', () => {
  it('scrolls a sync page to top when leaving the bottom of the previous page', async () => {
    const { app, router, el } = await mountPages([
      { path: '/', component: syncPage('HomePage') },
      { path: '/next', component: syncPage('NextPage') },
    ])
    setScroll(900)
    await router.push('/next')
    await flushScroll()
    expect(scrollY).toBe(0)
    expect(scrollCalls.at(-1)).toMatchObject({ top: 0 })
    await unmount(app, el)
  })

  it('restores savedPosition when going back to a sync page', async () => {
    const { app, router, el } = await mountPages([
      { path: '/', component: syncPage('HomePage') },
      { path: '/next', component: syncPage('NextPage') },
    ])
    setScroll(640)
    await router.push('/next')
    await flushScroll()
    expect(scrollY).toBe(0)
    await router.back()
    await flushScroll()
    expect(scrollY).toBe(640)
    expect(scrollCalls.at(-1)).toMatchObject({ top: 640 })
    await unmount(app, el)
  })

  it('applies scroll after suspense resolves on a page with async setup', async () => {
    const { gate, resolveGate } = deferred()
    const { app, router, el } = await mountPages([
      { path: '/', component: syncPage('HomePage') },
      { path: '/async', component: createAsyncPage(gate) },
    ])
    setScroll(720)
    trace.length = 0
    await router.push('/async')
    await flushScroll()
    expect(scrollY).toBe(720)
    expect(trace.some((entry) => entry.startsWith('scroll:'))).toBe(false)
    trace.length = 0
    resolveGate()
    await flushScroll()
    const endAt = trace.indexOf('page:loading:end')
    const scrollAt = trace.findIndex((entry) => entry.startsWith('scroll:'))
    expect(endAt).toBeGreaterThanOrEqual(0)
    expect(scrollAt).toBeGreaterThan(endAt)
    expect(scrollY).toBe(0)
    await unmount(app, el)
  })

  it('leaves no pending page:loading:end listeners after several navigations', async () => {
    const { gate, resolveGate } = deferred()
    const { app, router, nuxeApp, el } = await mountPages([
      { path: '/', component: syncPage('HomePage') },
      { path: '/a', component: syncPage('PageA') },
      { path: '/b', component: syncPage('PageB') },
      { path: '/c', component: syncPage('PageC') },
      { path: '/async', component: createAsyncPage(gate) },
    ])
    await router.push('/a')
    await flushScroll()
    await router.push('/b')
    await flushScroll()
    await router.push('/c')
    await flushScroll()
    await router.push('/async')
    resolveGate()
    await flushScroll()
    await router.push('/a')
    await flushScroll()
    const calls = scrollCalls.length
    const top = scrollY
    await nuxeApp.callHook('page:loading:end')
    await flushScroll()
    expect(scrollCalls.length).toBe(calls)
    expect(scrollY).toBe(top)
    await unmount(app, el)
  })

  it('wires client scrollBehavior through the resolved-navigation check', () => {
    expect(NUXE_ENTRY_CLIENT).toContain('createPageScrollBehavior(() => __nuxeApp, hashScrollBehavior)')
    expect(NUXE_ENTRY_CLIENT).not.toContain("hookOnce('page:loading:end'")
  })

  it('documents NuxePage as the app.vue outlet', () => {
    expect(readme).toContain('`app.vue` muestra las páginas con `<NuxePage>`')
    expect(readme).toContain('`<RouterView>` por sí solo no está soportado')
    expect(readme).not.toContain('<RouterView> para la navegación')
  })
})
