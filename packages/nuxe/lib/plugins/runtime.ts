import {
  getCurrentInstance,
  hasInjectionContext,
  inject,
  type App,
  type InjectionKey,
} from 'vue'
import type { Router } from 'vue-router'
import {
  getCurrentContext,
  provideNuxeState,
  type NuxeState,
  type RuntimeConfig,
} from '../runtime'


export interface NuxeApp {
  vueApp: App
  router: Router
  ssrContext?: Record<string, unknown>
  config: RuntimeConfig
  state: NuxeState
  hook: <N extends keyof NuxeAppHooks>(name: N, fn: NuxeAppHooks[N]) => void
  callHook: <N extends keyof NuxeAppHooks>(
    name: N,
    ...args: Parameters<NuxeAppHooks[N]>
  ) => Promise<void>
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

interface CreateNuxeAppOptions {
  vueApp: App
  router: Router
  ssrContext?: Record<string, unknown>
  config: RuntimeConfig
  state: NuxeState
}

type NuxeAppHolder = { nuxeApp?: NuxeApp }

export function createNuxeApp(options: CreateNuxeAppOptions): NuxeApp {
  const hooks = new Hookable()
  const nuxeApp: NuxeApp = {
    vueApp: options.vueApp,
    router: options.router,
    ssrContext: options.ssrContext,
    config: options.config,
    state: options.state,
    hook: (name, fn) => hooks.add(name, fn),
    callHook: (name, ...args) => hooks.call(name, ...args),
  }
  options.vueApp.provide(NUXE_APP_KEY, nuxeApp)
  provideNuxeState(options.vueApp, options.state)
  ;(options.vueApp as App & { $nuxe?: NuxeApp }).$nuxe = nuxeApp
  return nuxeApp
}

export function provideNuxeApp(ctx: NuxeAppHolder, nuxeApp: NuxeApp): void {
  ctx.nuxeApp = nuxeApp
}

export function tryUseNuxeApp(): NuxeApp | null {
  let nuxeApp: NuxeApp | null = null
  if (hasInjectionContext()) {
    const inst = getCurrentInstance()
    const viaVue = (inst?.appContext.app as (App & { $nuxe?: NuxeApp } | undefined))?.$nuxe
    nuxeApp = viaVue ?? inject(NUXE_APP_KEY, null) ?? null
  }
  if (!nuxeApp) {
    const ctx = getCurrentContext()
    nuxeApp = ctx?.nuxeApp ?? null
  }
  return nuxeApp
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

export type { NuxeAppHolder }
