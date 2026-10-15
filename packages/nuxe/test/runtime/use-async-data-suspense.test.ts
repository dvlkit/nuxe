// @vitest-environment happy-dom
import {nextTick, defineComponent, h, createApp} from 'vue'
import {createMemoryHistory, createRouter} from 'vue-router'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {NuxePage, createNuxeApp, createNuxeState, setHydratedPayload, useAsyncData} from '../../lib'

afterEach(() => {
    setHydratedPayload({})
})

function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((settle) => {
        resolve = settle
    })
    return {promise, resolve}
}

async function mountPage(events: string[], setup: () => unknown) {
    const Page = defineComponent({
        name: 'Page',
        setup,
    })
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{path: '/', component: Page}],
    })
    const app = createApp({
        name: 'Root',
        setup() {
            return () => h(NuxePage)
        },
    })
    const nuxeApp = createNuxeApp({
        vueApp: app,
        router,
        config: {public: {}},
        state: createNuxeState(),
    })
    nuxeApp.hook('page:loading:end', () => {
        events.push('page:loading:end')
    })
    router.beforeEach(() => nuxeApp.callHook('page:start'))
    app.use(router)
    await router.push('/')
    await router.isReady()
    const el = document.createElement('div')
    document.body.appendChild(el)
    app.mount(el)
    return {app, el}
}

describe('useAsyncData suspense', () => {
    it('emits page:loading:end after an awaited handler finishes', async () => {
        const gate = deferred<string>()
        const events: string[] = []
        const {app, el} = await mountPage(events, async () => {
            events.push('setup:start')
            const {data} = await useAsyncData('page', async () => {
                events.push('handler:start')
                const value = await gate.promise
                events.push('handler:end')
                return value
            })
            events.push(`setup:data:${data.value}`)
            return () => h('p', data.value)
        })
        await nextTick()

        expect(events).toContain('handler:start')
        expect(events).not.toContain('handler:end')
        expect(events).not.toContain('page:loading:end')

        gate.resolve('ready')
        await vi.waitFor(() => {
            expect(events).toContain('page:loading:end')
        })

        expect(events.indexOf('handler:end')).toBeGreaterThan(events.indexOf('handler:start'))
        expect(events.indexOf('setup:data:ready')).toBeGreaterThan(events.indexOf('handler:end'))
        expect(events.indexOf('page:loading:end')).toBeGreaterThan(events.indexOf('setup:data:ready'))
        app.unmount()
        el.remove()
    })

    it('emits page:loading:end before the handler when setup does not await', async () => {
        const gate = deferred<string>()
        const events: string[] = []
        const {app, el} = await mountPage(events, () => {
            events.push('setup:start')
            const {data} = useAsyncData('page', async () => {
                events.push('handler:start')
                const value = await gate.promise
                events.push('handler:end')
                return value
            })
            events.push('setup:sync')
            return () => h('p', data.value ?? '')
        })
        await nextTick()

        expect(events).toContain('page:loading:end')
        expect(events).toContain('handler:start')
        expect(events).not.toContain('handler:end')
        expect(events.indexOf('page:loading:end')).toBeGreaterThan(events.indexOf('setup:sync'))

        gate.resolve('ready')
        await vi.waitFor(() => {
            expect(events).toContain('handler:end')
        })
        expect(events.indexOf('page:loading:end')).toBeLessThan(events.indexOf('handler:end'))
        app.unmount()
        el.remove()
    })
})
