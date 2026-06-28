import type { Plugin } from 'vite'
import { generateClientMiddlewaresModule, generateServerMiddlewaresModule } from './middleware/codegen'
import type { ScannedMiddleware } from './middleware/scanner'
import { generateClientPluginsModule, generateServerPluginsModule } from './plugins/codegen'
import type { ScannedPlugin } from './plugins/scanner'
import { generateRoutesModule } from './pages/codegen'
import type { ScannedPage } from './pages/scanner'

const CLIENT_MIDDLEWARE_CHAIN_LOGIC = `
function __nuxe_runMiddlewareChain(to, from) {
  return __nuxe_runMiddlewareChainInner(to, from, new Set())
}

async function __nuxe_runMiddlewareChainInner(to, from, seen) {
  for (const mw of globalMiddlewares) {
    if (seen.has(mw)) continue
    seen.add(mw)
    const result = await mw(to, from)
    if (result === false) return false
    if (result && result !== true) return result
  }
  const meta = to && to.meta
  const named = meta && meta.middleware
  if (named) {
    const names = Array.isArray(named) ? named : [named]
    for (const name of names) {
      const mw = middlewares[name]
      if (!mw) continue
      if (seen.has(mw)) continue
      seen.add(mw)
      const result = await mw(to, from)
      if (result === false) return false
      if (result && result !== true) return result
    }
  }
  return true
}
`

const SERVER_MIDDLEWARE_CHAIN_LOGIC = `
const NAVIGATE_TO_MARKER = Symbol.for('@dvlkit/nuxe/navigate-to')
const ABORT_NAVIGATION_MARKER = Symbol.for('@dvlkit/nuxe/abort-navigation')

function __nuxe_setNavigateResponse(ssrContext, navigate) {
  const location = navigate.external
    ? navigate.to
    : (typeof navigate.to === 'string' ? navigate.to : (navigate.to.path || '/'))
  ssrContext._renderResponse = new Response(null, {
    status: navigate.redirectCode || 302,
    headers: { Location: location },
  })
}

function __nuxe_setAbortResponse(ssrContext, abort) {
  ssrContext._renderResponse = new Response(abort.statusMessage || 'Navigation aborted', {
    status: abort.statusCode || 403,
  })
}

async function __nuxe_handleMiddlewareResult(ssrContext, result) {
  const navigate = result && typeof result === 'object' && NAVIGATE_TO_MARKER in result ? result : null
  const abort = result && typeof result === 'object' && ABORT_NAVIGATION_MARKER in result ? result : null
  if (navigate) {
    __nuxe_setNavigateResponse(ssrContext, navigate)
    return false
  }
  if (abort) {
    __nuxe_setAbortResponse(ssrContext, abort)
    return false
  }
  if (result === false) {
    ssrContext._renderResponse = new Response('Forbidden', { status: 403 })
    return false
  }
  if (result && result !== true) return result
  return true
}

async function __nuxe_runGlobalMiddlewares(to, from, ssrContext) {
  for (const mw of globalMiddlewares) {
    const result = await mw(to, from)
    const handled = await __nuxe_handleMiddlewareResult(ssrContext, result)
    if (handled !== true) return handled
  }
  return true
}

async function __nuxe_runNamedMiddlewares(to, from, ssrContext) {
  const meta = to && to.meta
  const named = meta && meta.middleware
  if (!named) return true
  const names = Array.isArray(named) ? named : [named]
  const seen = new Set()
  for (const name of names) {
    const mw = middlewares[name]
    if (!mw) continue
    if (seen.has(mw)) continue
    seen.add(mw)
    const result = await mw(to, from)
    const handled = await __nuxe_handleMiddlewareResult(ssrContext, result)
    if (handled !== true) return handled
  }
  return true
}
`

const ENTRY_CLIENT_SOURCE = `import { createSSRApp, ref } from 'vue'
import { RouterView, createRouter, createWebHistory } from 'vue-router'
import { createHead } from '@unhead/vue/client'
import { NuxeRoot } from '@dvlkit/nuxe/components/nuxe-root'
import App from '/app/app.vue'
import { ErrorComponent } from 'virtual:nuxe/error'
import { routes } from 'virtual:nuxe/routes'
import { middlewares, globalMiddlewares } from 'virtual:nuxe/middlewares-client'
import { plugins } from 'virtual:nuxe/plugins-client'
import { setHydratedPayload, createError, provideError, deserializeError, provideRuntimeConfig, type RuntimeConfig, createNuxtApp, runPlugins, createNuxtState } from '@dvlkit/nuxe/runtime'
import publicRuntimeConfig from '/.nuxe/runtime-config-public.json'
${CLIENT_MIDDLEWARE_CHAIN_LOGIC}

async function main() {
  const head = createHead()
  const app = createSSRApp(NuxeRoot, { app: App, errorComponent: ErrorComponent })
  app.use(head)
  const error = ref(null)
  provideError(app, error)
  app.config.errorHandler = (err) => {
    error.value = createError(err)
  }
  let runtimeConfig: RuntimeConfig = publicRuntimeConfig
  const initialState = typeof window !== 'undefined' && window.__NUXE__?.state
    ? window.__NUXE__.state
    : {}
  if (typeof window !== 'undefined' && window.__NUXE__) {
    setHydratedPayload(window.__NUXE__.data || null)
    if (window.__NUXE__.runtimeConfig) {
      runtimeConfig = window.__NUXE__.runtimeConfig as RuntimeConfig
    }
    if (window.__NUXE__.error) {
      error.value = deserializeError(window.__NUXE__.error)
    }
  }
  provideRuntimeConfig(app, runtimeConfig)
  const originalWarn = console.warn
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('No match found')) return
    originalWarn(...args)
  }
  const router = createRouter({
    history: createWebHistory(),
    routes,
  })
  const state = createNuxtState(initialState)
  const nuxtApp = createNuxtApp({ vueApp: app, router, config: runtimeConfig, state })
  await runPlugins(plugins, nuxtApp)
  await nuxtApp.callHook('app:created')
  router.beforeEach(() => nuxtApp.callHook('page:start'))
  let isFirstNavigation = true
  router.beforeEach((to, from) => {
    if (isFirstNavigation) {
      isFirstNavigation = false
      if (error.value) return
      return __nuxe_runMiddlewareChain(to, from)
    }
    if (error.value) {
      error.value = null
      return
    }
    return __nuxe_runMiddlewareChain(to, from)
  })
  router.afterEach(() => nuxtApp.callHook('page:finish'))
  app.use(router)
  await router.isReady()
  console.warn = originalWarn
  app.mount('#app')
  await nuxtApp.callHook('app:mounted')
}

void main()
`

const ENTRY_SERVER_SOURCE = `import { createSSRApp, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createStreamableHead } from '@dvlkit/nuxe/runtime'
import { NuxeRoot } from '@dvlkit/nuxe/components/nuxe-root'
import { routes } from 'virtual:nuxe/routes'
import { ErrorComponent } from 'virtual:nuxe/error'
import { createRequestContext, provideRequestContext, createError, provideError, provideRuntimeConfig, createNuxtApp, runPlugins, createNuxtState } from '@dvlkit/nuxe/runtime'
import runtimeConfig from '/.nuxe/runtime-config.json'
import App from '/app/app.vue'
import { middlewares, globalMiddlewares } from 'virtual:nuxe/middlewares-server'
import { plugins } from 'virtual:nuxe/plugins-server'
${SERVER_MIDDLEWARE_CHAIN_LOGIC}

async function createApp(ssrContext) {
  const ctx = createRequestContext()
  const app = createSSRApp(NuxeRoot, { app: App, errorComponent: ErrorComponent })
  provideRequestContext(app, ctx)
  provideRuntimeConfig(app, runtimeConfig)
  const error = ref(ssrContext.error || null)
  provideError(app, error)
  const { head } = createStreamableHead()
  app.use(head)
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
    warnHandler: (msg) => {
      if (typeof msg === 'string' && msg.includes('No match found')) return
      console.warn(msg)
    },
  })
  const state = createNuxtState()
  const nuxtApp = createNuxtApp({ vueApp: app, router, config: runtimeConfig, ssrContext, state })
  ssrContext.nuxtApp = nuxtApp
  await runPlugins(plugins, nuxtApp)
  await nuxtApp.callHook('app:created')
  app.use(router)

  const url = new URL(ssrContext.url, 'http://localhost')
  const href = url.pathname + url.search

  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('No match found')) return
    originalWarn(...args)
  }

  let resolved
  try {
    resolved = router.resolve(href)
  } finally {
    console.warn = originalWarn
  }

  const routeRules = resolved.meta?.routeRules

  if (routeRules?.redirect) {
    ssrContext._renderResponse = new Response(null, {
      status: 302,
      headers: { Location: routeRules.redirect },
    })
    ssrContext.modules = ssrContext.modules || new Set()
    ssrContext.head = head
    ssrContext.ctx = ctx
    return app
  }

  if (routeRules?.ssr === false) {
    ctx.routeRules = { ssr: false }
    ssrContext.modules = ssrContext.modules || new Set()
    ssrContext.head = head
    ssrContext.ctx = ctx
    ssrContext._spa = true
    return app
  }

  await __nuxe_runGlobalMiddlewares(resolved, router.currentRoute.value, ssrContext)
  if (ssrContext._renderResponse) {
    ssrContext.modules = ssrContext.modules || new Set()
    ssrContext.head = head
    ssrContext.ctx = ctx
    return app
  }

  if (resolved.matched.length === 0) {
    ssrContext.error = createError({ statusCode: 404, statusMessage: 'Page not found' })
    error.value = ssrContext.error
    ssrContext.modules = ssrContext.modules || new Set()
    ssrContext.head = head
    ssrContext.ctx = ctx
    return app
  }

  router.beforeEach((to, from) => __nuxe_runNamedMiddlewares(to, from, ssrContext))

  await nuxtApp.callHook('page:start')
  try {
    await router.push(href)
  } catch (err) {
    if (err && typeof err == 'object' && 'type' in err) {
      // navigation was aborted or redirected; _renderResponse is already set if needed
    } else {
      ssrContext.error = createError(err)
      error.value = ssrContext.error
    }
  }

  await router.isReady()
  await nuxtApp.callHook('page:finish')

  ssrContext.modules = ssrContext.modules || new Set()
  ssrContext.head = head
  ssrContext.ctx = ctx

  return app
}

export default createApp
`

export const NUXE_ENTRY_SERVER: string = ENTRY_SERVER_SOURCE
export const NUXE_ENTRY_CLIENT: string = ENTRY_CLIENT_SOURCE

export interface NuxeOptions {
  layouts: string[]
  middlewares?: ScannedMiddleware[]
  pages?: ScannedPage[]
  plugins?: ScannedPlugin[]
  errorComponent?: boolean
}

function buildLayoutsModule(layouts: string[]): string {
  if (layouts.length === 0) {
    return 'export default {}\n'
  }
  const imports = layouts
    .map((file, i) => `import __layout_${i} from '/app/layouts/${file}'`)
    .join('\n')
  const map = layouts
    .map((file, i) => {
      const name = file.replace(/\.vue$/, '').toLowerCase()
      return `  '${name}': __layout_${i}`
    })
    .join(',\n')
  return `${imports}\n\nexport default {\n${map}\n}\n`
}

function buildErrorModule(hasErrorComponent: boolean): string {
  if (hasErrorComponent) {
    return `import ErrorComponent from '/app/error.vue'\nexport { ErrorComponent }\n`
  }
  return `import { defineComponent, h } from 'vue'\n
export const ErrorComponent = defineComponent({
  name: 'NuxeFallbackError',
  props: {
    error: { type: Object, required: true },
  },
  setup(props) {
    return () => h('div', { style: 'font-family:sans-serif;padding:2rem' }, [
      h('h1', null, props.error.statusCode || 'Error'),
      h('p', null, props.error.statusMessage || props.error.message || 'An error occurred'),
    ])
  },
})\n`
}

export default function nuxe(options: NuxeOptions = { layouts: [] }): Plugin {
  const layoutsModule = buildLayoutsModule(options.layouts)
  const clientMiddlewaresModule = generateClientMiddlewaresModule(options.middlewares ?? [])
  const serverMiddlewaresModule = generateServerMiddlewaresModule(options.middlewares ?? [])
  const clientPluginsModule = generateClientPluginsModule(options.plugins ?? [])
  const serverPluginsModule = generateServerPluginsModule(options.plugins ?? [])
  const routesModule = generateRoutesModule(options.pages ?? [])
  const errorModule = buildErrorModule(options.errorComponent ?? false)

  return {
    name: 'nuxe:framework',

    resolveId(id) {
      if (id === 'virtual:nuxe/layouts' || id === '\0virtual:nuxe/layouts') {
        return '\0virtual:nuxe/layouts'
      }
      if (id === 'virtual:nuxe/middlewares-client' || id === '\0virtual:nuxe/middlewares-client') {
        return '\0virtual:nuxe/middlewares-client'
      }
      if (id === 'virtual:nuxe/middlewares-server' || id === '\0virtual:nuxe/middlewares-server') {
        return '\0virtual:nuxe/middlewares-server'
      }
      if (id === 'virtual:nuxe/routes' || id === '\0virtual:nuxe/routes') {
        return '\0virtual:nuxe/routes'
      }
      if (id === 'virtual:nuxe/error' || id === '\0virtual:nuxe/error') {
        return '\0virtual:nuxe/error'
      }
      if (id === 'virtual:nuxe/plugins-client' || id === '\0virtual:nuxe/plugins-client') {
        return '\0virtual:nuxe/plugins-client'
      }
      if (id === 'virtual:nuxe/plugins-server' || id === '\0virtual:nuxe/plugins-server') {
        return '\0virtual:nuxe/plugins-server'
      }
    },

    load(id) {
      if (id === '\0virtual:nuxe/layouts') return layoutsModule
      if (id === '\0virtual:nuxe/middlewares-client') return clientMiddlewaresModule
      if (id === '\0virtual:nuxe/middlewares-server') return serverMiddlewaresModule
      if (id === '\0virtual:nuxe/routes') return routesModule
      if (id === '\0virtual:nuxe/error') return errorModule
      if (id === '\0virtual:nuxe/plugins-client') return clientPluginsModule
      if (id === '\0virtual:nuxe/plugins-server') return serverPluginsModule
    },
  }
}
