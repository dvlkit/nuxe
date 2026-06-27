import { inject, type App, type InjectionKey } from 'vue'
import type { Router } from 'vue-router'
import { provideNuxtState, type NuxtState, type RuntimeConfig } from '../runtime'

export interface NuxtApp {
  vueApp: App
  router: Router
  ssrContext?: Record<string, unknown>
  config: RuntimeConfig
  state: NuxtState
  hook: <N extends keyof NuxtAppHooks>(name: N, fn: NuxtAppHooks[N]) => void
  callHook: <N extends keyof NuxtAppHooks>(name: N, ...args: Parameters<NuxtAppHooks[N]>) => Promise<void>
}

const NUXT_APP_KEY: InjectionKey<NuxtApp> = Symbol('@dvlkit/nuxt-app')

export interface NuxtAppHooks {
  'app:created': () => void | Promise<void>
  'app:mounted': () => void | Promise<void>
  'page:start': () => void | Promise<void>
  'page:finish': () => void | Promise<void>
}

export interface NuxtPluginObject {
  setup: (nuxtApp: NuxtApp) => void | Promise<void>
  parallel?: boolean
}

export type NuxtPlugin = NuxtPluginObject | ((nuxtApp: NuxtApp) => void | Promise<void>)

export function defineNuxtPlugin(plugin: NuxtPlugin): NuxtPlugin {
  return plugin
}

export const defineNuxePlugin = defineNuxtPlugin

class Hookable {
  private hooks: { [K in keyof NuxtAppHooks]?: Array<NuxtAppHooks[K]> } = {}

  add<N extends keyof NuxtAppHooks>(name: N, fn: NuxtAppHooks[N]): void {
    if (!this.hooks[name]) {
      this.hooks[name] = []
    }
    this.hooks[name]!.push(fn)
  }

  async call<N extends keyof NuxtAppHooks>(name: N, ...args: Parameters<NuxtAppHooks[N]>): Promise<void> {
    const fns = this.hooks[name] ?? []
    for (const fn of fns) {
      await (fn as (...a: unknown[]) => void | Promise<void>)(...args)
    }
  }
}

export function createNuxtApp(options: {
  vueApp: App
  router: Router
  ssrContext?: Record<string, unknown>
  config: RuntimeConfig
  state: NuxtState
}): NuxtApp {
  const hooks = new Hookable()
  const nuxtApp: NuxtApp = {
    ...options,
    hook: (name, fn) => hooks.add(name, fn),
    callHook: (name, ...args) => hooks.call(name, ...args),
  }
  options.vueApp.provide(NUXT_APP_KEY, nuxtApp)
  provideNuxtState(options.vueApp, options.state)
  return nuxtApp
}

export function useNuxtApp(): NuxtApp {
  const nuxtApp = inject(NUXT_APP_KEY)
  if (!nuxtApp) {
    throw new Error('[nuxt] useNuxtApp() must be called inside a Nuxt plugin or setup function.')
  }
  return nuxtApp
}

export async function runPlugins(plugins: NuxtPlugin[], nuxtApp: NuxtApp): Promise<void> {
  for (const plugin of plugins) {
    const setup = typeof plugin === 'function' ? plugin : plugin.setup
    await setup(nuxtApp)
  }
}
