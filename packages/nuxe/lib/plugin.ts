import type { Plugin, ViteDevServer } from 'vite'
import { isAbsolute, join, sep } from 'node:path'
import { generateClientMiddlewaresModule, generateServerMiddlewaresModule } from './middleware/codegen'
import type { ScannedMiddleware } from './middleware/scanner'
import { generateClientPluginsModule, generateServerPluginsModule } from './plugins/codegen'
import type { ScannedPlugin } from './plugins/scanner'
import { generateRoutesModule } from './pages/codegen'
import { createPagesContext, type PagesContext } from './pages/context'

const CLIENT_MIDDLEWARE_CHAIN_LOGIC = `
function __nuxe_runMiddlewareChain(to, from) {
  return __nuxe_runMiddlewareChainInner(__nuxeApp, to, from, new Set())
}

async function __nuxe_runMiddlewareChainInner(app, to, from, seen) {
  for (const mw of globalMiddlewares) {
    if (seen.has(mw)) continue
    seen.add(mw)
    const result = await runWithNuxeApp(app, () => mw(to, from))
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
      const result = await runWithNuxeApp(app, () => mw(to, from))
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

async function __nuxe_runGlobalMiddlewares(app, to, from, ssrContext) {
  for (const mw of globalMiddlewares) {
    const result = await runWithNuxeApp(app, () => mw(to, from))
    const handled = await __nuxe_handleMiddlewareResult(ssrContext, result)
    if (handled !== true) return handled
  }
  return true
}

async function __nuxe_runNamedMiddlewares(app, to, from, ssrContext) {
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
    const result = await runWithNuxeApp(app, () => mw(to, from))
    const handled = await __nuxe_handleMiddlewareResult(ssrContext, result)
    if (handled !== true) return handled
  }
  return true
}
`

const ENTRY_CLIENT_SOURCE = `import { createSSRApp, ref } from 'vue'
import { START_LOCATION, RouterView, createRouter, createWebHistory } from 'vue-router'
import { createHead } from '@dvlkit/nuxe/runtime'
import { NuxeRoot } from '@dvlkit/nuxe/components/nuxe-root'
import App from '/app/app.vue'
import { ErrorComponent } from 'virtual:nuxe/error'
import routes, { handleHotUpdate } from 'virtual:nuxe/routes'
import { middlewares, globalMiddlewares } from 'virtual:nuxe/middlewares-client'
import { plugins } from 'virtual:nuxe/plugins-client'
import { setHydratedPayload, createError, provideError, deserializeError, provideRuntimeConfig, readHydrationPayload, EMPTY, type RuntimeConfig, createNuxeApp, runPlugins, runWithNuxeApp, createNuxeState } from '@dvlkit/nuxe/runtime'
let __nuxeApp
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
  let runtimeConfig: RuntimeConfig = (window.__NUXE__?.runtimeConfig as RuntimeConfig | undefined) ?? EMPTY
  const hydrated = readHydrationPayload()
  const initialState = hydrated?.state ?? {}
  setHydratedPayload(hydrated?.data ?? null)
  if (hydrated?.error) {
    error.value = deserializeError(hydrated.error)
  }
  delete window.__NUXE__
  provideRuntimeConfig(app, runtimeConfig)
  
  const routerPublicCfg = (runtimeConfig?.public?.router ?? {}) as { scrollBehaviorType?: 'auto' | 'smooth' | 'instant' }
  const hashScrollBehavior = routerPublicCfg?.scrollBehaviorType ?? 'auto'
  
  const originalWarn = console.warn
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('No match found')) return
    originalWarn(...args)
  }
  
  function getHashElementScrollMarginTop(selector: string): number {
    try {
      const elem = document.querySelector(selector)
      if (elem) {
        return (Number.parseFloat(getComputedStyle(elem).scrollMarginTop) || 0) + (Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0)
      }
    } catch {
      // ignore
    }
    return 0
  }
  
  const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
      const stripTrailingSlash = (p: string) => (p.endsWith('/') ? p.slice(0, -1) : p)
      const samePath = stripTrailingSlash(to.path) === stripTrailingSlash(from.path)
      if (samePath) {
        if (from.hash && !to.hash) return { left: 0, top: 0 }
        if (to.hash) {
          return {
            el: to.hash,
            top: getHashElementScrollMarginTop(to.hash),
            behavior: hashScrollBehavior,
          }
        }
        return false
      }
      
      const metaScrollToTop = to.meta?.scrollToTop
      const routeAllowsScrollToTop = typeof metaScrollToTop === 'function'
        ? metaScrollToTop(to, from)
        : metaScrollToTop
      if (routeAllowsScrollToTop === false) return false
      
      const resolvePosition = () => {
        if (savedPosition) return savedPosition
        
        if (to.hash) {
          return {
            el: to.hash,
            top: getHashElementScrollMarginTop(to.hash),
            behavior: hashScrollBehavior,
          }
        }
      
        return { top: 0 }
      }
      
      if (from === START_LOCATION) return resolvePosition()
      
      return new Promise((resolve) => {
        const doScroll = () => {
          requestAnimationFrame(() => resolve(resolvePosition()))
        }
        __nuxeApp.hookOnce('page:loading:end', doScroll)
      })
    },
  })
  
  if (import.meta.client && 'scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'auto'
  }
  
  handleHotUpdate(router)
  const nuxeApp = createNuxeApp({ vueApp: app, router, config: runtimeConfig, state: createNuxeState(initialState) })
  __nuxeApp = nuxeApp
  await runPlugins(plugins, nuxeApp)
  await nuxeApp.callHook('app:created')
  router.beforeEach(() => nuxeApp.callHook('page:start'))
  router.beforeEach(() => nuxeApp.callHook('page:loading:start'))
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
  router.afterEach(() => nuxeApp.callHook('page:finish'))
  app.use(router)
  await router.isReady()
  console.warn = originalWarn
  app.mount('#app')
  await nuxeApp.callHook('app:mounted')
}

void main()
`

const ENTRY_SERVER_SOURCE = `import '@dvlkit/nuxe/runtime/server-polyfill'
import { createSSRApp, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createStreamableHead } from '@dvlkit/nuxe/runtime/server-head'
import { NuxeRoot } from '@dvlkit/nuxe/components/nuxe-root'
import { ErrorComponent } from 'virtual:nuxe/error'
import { createError, provideError, provideRuntimeConfig, provideBaseURL, createNuxeApp, runPlugins, runWithNuxeApp, createNuxeState } from '@dvlkit/nuxe/runtime'
import App from '/app/app.vue'
import routes from 'virtual:nuxe/routes'
import { middlewares, globalMiddlewares } from 'virtual:nuxe/middlewares-server'
import { plugins } from 'virtual:nuxe/plugins-server'
${SERVER_MIDDLEWARE_CHAIN_LOGIC}

async function createApp(ssrContext) {
  ;(globalThis as { __NUXE_SSR_CONTEXT__?: typeof ssrContext }).__NUXE_SSR_CONTEXT__ = ssrContext
  const runtimeConfig = ssrContext.runtimeConfig
  const app = createSSRApp(NuxeRoot, { app: App, errorComponent: ErrorComponent })
  provideRuntimeConfig(app, runtimeConfig)
  provideBaseURL(app, (runtimeConfig as { baseUrl?: string }).baseUrl)
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
  const state = createNuxeState()
  const nuxeApp = createNuxeApp({ vueApp: app, router, config: runtimeConfig, ssrContext, state })
  ssrContext.nuxeApp = nuxeApp
  await runPlugins(plugins, nuxeApp)
  await nuxeApp.callHook('app:created')
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
    return app
  }

  if (routeRules?.ssr === false) {
    ssrContext.routeRules = { ssr: false }
    ssrContext.modules = ssrContext.modules || new Set()
    ssrContext.head = head
    ssrContext._spa = true
    return app
  }

  await __nuxe_runGlobalMiddlewares(nuxeApp, resolved, router.currentRoute.value, ssrContext)
  if (ssrContext._renderResponse) {
    ssrContext.modules = ssrContext.modules || new Set()
    ssrContext.head = head
    return app
  }

  if (resolved.matched.length === 0) {
    ssrContext.error = createError({ statusCode: 404, statusMessage: 'Page not found' })
    error.value = ssrContext.error
    ssrContext.modules = ssrContext.modules || new Set()
    ssrContext.head = head
    return app
  }

  router.beforeEach((to, from) => __nuxe_runNamedMiddlewares(nuxeApp, to, from, ssrContext))

  await nuxeApp.callHook('page:start')
  await nuxeApp.callHook('page:loading:start')
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

  if (ssrContext._renderResponse) {
    ssrContext.modules = ssrContext.modules || new Set()
    ssrContext.head = head
    return app
  }

  await router.isReady()
  await nuxeApp.callHook('page:finish')

  ssrContext.modules = ssrContext.modules || new Set()
  ssrContext.head = head

  return app
}

export default createApp
`

export const NUXE_ENTRY_SERVER: string = ENTRY_SERVER_SOURCE
export const NUXE_ENTRY_CLIENT: string = ENTRY_CLIENT_SOURCE

export interface NuxeOptions {
  layouts: string[]
  cwd: string
  pagesDir?: string
  middlewares?: ScannedMiddleware[]
  plugins?: ScannedPlugin[]
  errorComponent?: boolean
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

export default function nuxe(options: NuxeOptions): Plugin {
  const clientMiddlewaresModule = generateClientMiddlewaresModule(options.middlewares ?? [])
  const serverMiddlewaresModule = generateServerMiddlewaresModule(options.middlewares ?? [])
  const clientPluginsModule = generateClientPluginsModule(options.plugins ?? [])
  const serverPluginsModule = generateServerPluginsModule(options.plugins ?? [])
  const errorModule = buildErrorModule(options.errorComponent ?? false)

  let routesModule = ''
  let pagesCtx: PagesContext | undefined

  function rebuildRoutes(): void {
    if (!pagesCtx) return
    routesModule = generateRoutesModule(pagesCtx.emit(), pagesCtx.pagesRoot)
  }

  function isUnderPagesDir(absolutePath: string): boolean {
    if (!options.cwd) return false
    const root = join(options.cwd, options.pagesDir ?? 'app/pages')
    return absolutePath === root || absolutePath.startsWith(root + sep)
  }

  function invalidateRoutesModule(server: ViteDevServer): void {
    const mod = server.moduleGraph.getModuleById('\0virtual:nuxe/routes')
    if (mod) {
      server.moduleGraph.invalidateModule(mod)
      server.ws.send({type: 'full-reload', path: '*'})
    }
  }

  return {
    name: 'nuxe:framework',

    configResolved() {
      pagesCtx = createPagesContext({
        cwd: options.cwd,
        pagesDir: options.pagesDir,
      })
      rebuildRoutes()
    },

    configureServer(server) {
      if (!pagesCtx || !options.cwd) return

      const handle = (filePath: string, kind: 'add' | 'change' | 'unlink') => {
        const absolute = isAbsolute(filePath) ? filePath : join(options.cwd, filePath)
        if (!isUnderPagesDir(absolute)) return
        if (!absolute.endsWith('.vue')) return

        if (kind === 'add' || kind === 'change') {
          pagesCtx!.addFile(absolute)
        } else {
          pagesCtx!.removeFile(absolute)
        }
        rebuildRoutes()
        invalidateRoutesModule(server)
      }

      server.watcher.on('add', (p) => handle(p, 'add'))
      server.watcher.on('change', (p) => handle(p, 'change'))
      server.watcher.on('unlink', (p) => handle(p, 'unlink'))
    },

    resolveId(id) {
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
      if (id === '\0virtual:nuxe/middlewares-client') return clientMiddlewaresModule
      if (id === '\0virtual:nuxe/middlewares-server') return serverMiddlewaresModule
      if (id === '\0virtual:nuxe/routes') return routesModule
      if (id === '\0virtual:nuxe/error') return errorModule
      if (id === '\0virtual:nuxe/plugins-client') return clientPluginsModule
      if (id === '\0virtual:nuxe/plugins-server') return serverPluginsModule
    },
  }
}
