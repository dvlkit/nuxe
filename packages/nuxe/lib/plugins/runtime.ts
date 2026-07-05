import { type App, type InjectionKey } from 'vue'
import type { Router } from 'vue-router'
import {
  type NuxeState,
  type RuntimeConfig,
} from '../runtime'
import {
  NUXE_APP_INJECTION_KEY,
  tryUseNuxeApp,
  setNuxeApp,
  nuxeAppContext,
} from '../runtime/app-context'
export { tryUseNuxeApp } from '../runtime/app-context'

export interface NuxeApp {
  vueApp: App
  router: Router
  ssrContext?: Record<string, unknown>
  config: RuntimeConfig
  state: NuxeState
  payload: { state: NuxeState }
  hook: <N extends keyof NuxeAppHooks>(name: N, fn: NuxeAppHooks[N]) => void
  hookOnce: <N extends keyof NuxeAppHooks>(name: N, fn: NuxeAppHooks[N]) => void
  callHook: <N extends keyof NuxeAppHooks>(
    name: N,
    ...args: Parameters<NuxeAppHooks[N]>
  ) => Promise<void>
}

const NUXE_APP_KEY: InjectionKey<NuxeApp> = NUXE_APP_INJECTION_KEY

export interface NuxeAppHooks {
  'app:created': () => void | Promise<void>
  'app:mounted': () => void | Promise<void>
  'page:start': () => void | Promise<void>
  'page:finish': () => void | Promise<void>
  'page:loading:start': () => void | Promise<void>
  'page:loading:end': () => void | Promise<void>
}

export interface NuxePluginObject {
  setup: (nuxeApp: NuxeApp) => void | Promise<void>
  parallel?: boolean
}

export type NuxePlugin =
  | NuxePluginObject
  | ((nuxeApp: NuxeApp) => void | Promise<void>)

export function defineNuxePlugin(plugin: NuxePlugin): NuxePlugin {
  return plugin
}

class Hookable {
  private hooks: { [K in keyof NuxeAppHooks]?: Array<NuxeAppHooks[K]> } = {}

  add<N extends keyof NuxeAppHooks>(name: N, fn: NuxeAppHooks[N]): void {
    if (!this.hooks[name]) {
      this.hooks[name] = []
    }
    this.hooks[name]!.push(fn)
  }

  remove<N extends keyof NuxeAppHooks>(name: N, fn: NuxeAppHooks[N]): void {
    const arr = this.hooks[name]
    if (!arr) return
    const idx = arr.indexOf(fn)
    if (idx >= 0) arr.splice(idx, 1)
  }

  once<N extends keyof NuxeAppHooks>(name: N, fn: NuxeAppHooks[N]): void {
    const wrapped = ((...args: unknown[]) => {
      this.remove(name, wrapped as NuxeAppHooks[N])
      return (fn as (...a: unknown[]) => unknown)(...args)
    }) as NuxeAppHooks[N]
    this.add(name, wrapped)
  }

  async call<N extends keyof NuxeAppHooks>(
    name: N,
    ...args: Parameters<NuxeAppHooks[N]>
  ): Promise<void> {
    const fns = this.hooks[name] ?? []
    for (const fn of fns) {
      await (fn as (...a: unknown[]) => void | Promise<void>)(...args)
    }
  }
}

const NUXE_STATE_KEY: InjectionKey<NuxeState> = Symbol('@dvlkit/nuxe-state')

interface CreateNuxeAppOptions {
  vueApp: App
  router: Router
  ssrContext?: Record<string, unknown>
  config: RuntimeConfig
  state: NuxeState
}


export function createNuxeApp(options: CreateNuxeAppOptions): NuxeApp {
  const hooks = new Hookable()
  const state = options.state
  const nuxeApp: NuxeApp = {
    vueApp: options.vueApp,
    router: options.router,
    ssrContext: options.ssrContext,
    config: options.config,
    state,
    payload: {state},
    hook: (name, fn) => hooks.add(name, fn),
    hookOnce: (name, fn) => hooks.once(name, fn),
    callHook: (name, ...args) => hooks.call(name, ...args),
  }
  options.vueApp.provide(NUXE_APP_KEY, nuxeApp)
  ;(options.vueApp as App & { $nuxe?: NuxeApp }).$nuxe = nuxeApp
  options.vueApp.provide(NUXE_STATE_KEY, state)
  return nuxeApp
}

export function provideNuxeApp(
  ctx: { nuxeApp?: NuxeApp },
  nuxeApp: NuxeApp,
): void {
  ctx.nuxeApp = nuxeApp
  setNuxeApp(nuxeApp)
}

export function runWithNuxeApp<T>(nuxeApp: NuxeApp, fn: () => T): Promise<T> {
  return nuxeApp.vueApp.runWithContext(() => (
    nuxeAppContext.callAsync(nuxeApp, fn)
  )) as Promise<T>
}

export function useNuxeApp(): NuxeApp {
  const nuxeApp = tryUseNuxeApp()
  if (!nuxeApp) {
    throw new Error(
      '[nuxe] useNuxeApp() must be called inside a Nuxe plugin or setup function.',
    )
  }
  return nuxeApp
}

export async function runPlugins(
  plugins: NuxePlugin[],
  nuxeApp: NuxeApp,
): Promise<void> {
  for (const plugin of plugins) {
    const setup = typeof plugin === 'function' ? plugin : plugin.setup
    await setup(nuxeApp)
  }
}

export type NuxeAppHolder = { nuxeApp?: NuxeApp }
