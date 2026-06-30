import { describe, expect, it } from 'vitest'
import { createSSRApp, defineComponent } from 'vue'
import { createNuxeApp, createNuxeState, useRequestEvent, useRequestHeaders } from '../../lib'

describe('useRequestEvent', () => {
  it('returns the raw request from ssrContext', () => {
    const request = new Request('http://localhost/test', {
      headers: { 'x-custom': 'hello' },
    })
    const app = createSSRApp(defineComponent({ render: () => null }))
    createNuxeApp({
      vueApp: app,
      router: {} as any,
      config: { public: {} },
      state: createNuxeState(),
      ssrContext: { request },
    })

    let event: ReturnType<typeof useRequestEvent>
    app.runWithContext(() => {
      event = useRequestEvent()
    })

    expect(event).toBe(request)
  })

  it('returns undefined on client (no ssrContext)', () => {
    const app = createSSRApp(defineComponent({ render: () => null }))
    createNuxeApp({
      vueApp: app,
      router: {} as any,
      config: { public: {} },
      state: createNuxeState(),
    })

    let event: ReturnType<typeof useRequestEvent>
    app.runWithContext(() => {
      event = useRequestEvent()
    })

    expect(event).toBeUndefined()
  })
})

describe('useRequestHeaders', () => {
  it('returns request headers as a plain object', () => {
    const request = new Request('http://localhost/test', {
      headers: {
        'x-custom': 'hello',
        accept: 'application/json',
      },
    })
    const app = createSSRApp(defineComponent({ render: () => null }))
    createNuxeApp({
      vueApp: app,
      router: {} as any,
      config: { public: {} },
      state: createNuxeState(),
      ssrContext: { request },
    })

    let headers: ReturnType<typeof useRequestHeaders>
    app.runWithContext(() => {
      headers = useRequestHeaders()
    })

    expect(headers!['x-custom']).toBe('hello')
    expect(headers!.accept).toBe('application/json')
  })

  it('returns empty object on client', () => {
    const app = createSSRApp(defineComponent({ render: () => null }))
    createNuxeApp({
      vueApp: app,
      router: {} as any,
      config: { public: {} },
      state: createNuxeState(),
    })

    let headers: ReturnType<typeof useRequestHeaders>
    app.runWithContext(() => {
      headers = useRequestHeaders()
    })

    expect(headers).toEqual({})
  })
})
