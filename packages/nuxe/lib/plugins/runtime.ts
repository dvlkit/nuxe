import { inject, type App, type InjectionKey } from 'vue'
import type { Router } from 'vue-router'
import { provideNuxeState, type NuxeState, type RuntimeConfig } from '../runtime'


export interface NuxeApp {
  vueApp: App
  router: Router
  ssrContext?: Record<string, unknown>
  config: RuntimeConfig
  state: NuxeState
  hook: <N extends keyof NuxeAppHooks>(name: N, fn: NuxeAppHooks[N]) => void
  callHook: <N extends keyof NuxeAppHooks>(name: N, ...args: Parameters<NuxeAppHooks[N]>) => Promise<void>
}

const NUXE_APP_KEY: InjectionKey<NuxeApp> = Symbol('@dvlkit/nuxe-app')

export interface NuxeAppHooks {
  'app:created': () => void | Promise<void>
  'app:mounted': () => void | Promise<void>
  'page:start': () => void | Promise<void>
  'page:finish': () => void | Promise<void>
}

export interface NuxePluginObject {
  setup: (nuxeApp: NuxeApp) => void | Promise<void>
  parallel?: boolean
}

export type NuxePlugin = NuxePluginObject | ((nuxeApp: NuxeApp) => void | Promise<void>)

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

  async call<N extends keyof NuxeAppHooks>(name: N, ...args: Parameters<NuxeAppHooks[N]>): Promise<void> {
    const fns = this.hooks[name] ?? []
    for (const fn of fns) {
      await (fn as (...a: unknown[]) => void | Promise<void>)(...args)
    }
  }
}

export function createNuxeApp(options: {
  vueApp: App
  router: Router
  ssrContext?: Record<string, unknown>
  config: RuntimeConfig
  state: NuxeState
}): NuxeApp {
  const hooks = new Hookable()
  const nuxeApp: NuxeApp = {
    ...options,
    hook: (name, fn) => hooks.add(name, fn),
    callHook: (name, ...args) => hooks.call(name, ...args),
  }
  options.vueApp.provide(NUXE_APP_KEY, nuxeApp)
  provideNuxeState(options.vueApp, options.state)
  return nuxeApp
}

export function useNuxeApp(): NuxeApp {
  const nuxeApp = inject(NUXE_APP_KEY)
  if (!nuxeApp) {
    throw new Error('[nuxe] useNuxeApp() must be called inside a Nuxe plugin or setup function.')
  }
  return nuxeApp
}

export async function runPlugins(plugins: NuxePlugin[], nuxeApp: NuxeApp): Promise<void> {
  for (const plugin of plugins) {
    const setup = typeof plugin === 'function' ? plugin : plugin.setup
    await setup(nuxeApp)
  }
}
