import type { Plugin } from 'vite'
import { generateClientMiddlewaresModule, generateServerMiddlewaresModule } from './middleware/codegen'
import type { ScannedMiddleware } from './middleware/scanner'
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

const ENTRY_CLIENT_SOURCE = `import { createSSRApp } from 'vue'
import { RouterView, createRouter, createWebHistory } from 'vue-router'
import { routes } from 'virtual:nuxe/routes'
import { createHead } from '@unhead/vue/client'
import { NuxeRoot } from '@dvlkit/nuxe/components/nuxe-root'
import App from '/app/app.vue'
import { middlewares, globalMiddlewares } from 'virtual:nuxe/middlewares-client'
import { setHydratedPayload } from '@dvlkit/nuxe/runtime'
${CLIENT_MIDDLEWARE_CHAIN_LOGIC}

async function main() {
  if (typeof window !== 'undefined' && window.__NUXE__) {
    setHydratedPayload(window.__NUXE__.data || null)
  }
  const head = createHead()
  const app = createSSRApp(NuxeRoot, { app: App })
  app.use(head)
  const router = createRouter({
    history: createWebHistory(),
    routes,
  })
  app.use(router)
  router.beforeEach((to, from) => __nuxe_runMiddlewareChain(to, from))
  await router.isReady()
  app.mount('#app')
}

void main()
`

const ENTRY_SERVER_SOURCE = `import { createSSRApp } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createStreamableHead } from '@unhead/vue/stream/server'
import { NuxeRoot } from '@dvlkit/nuxe/components/nuxe-root'
import { routes } from 'virtual:nuxe/routes'
import { createRequestContext, provideRequestContext } from '@dvlkit/nuxe/runtime'
import App from '/app/app.vue'
import { middlewares, globalMiddlewares } from 'virtual:nuxe/middlewares-server'
${SERVER_MIDDLEWARE_CHAIN_LOGIC}

async function createApp(ssrContext) {
  const ctx = createRequestContext()
  const app = createSSRApp(NuxeRoot, { app: App })
  provideRequestContext(app, ctx)
  const { head } = createStreamableHead()
  app.use(head)
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })
  app.use(router)

  const url = new URL(ssrContext.url, 'http://localhost')
  const href = url.pathname + url.search
  const resolved = router.resolve(href)
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
    ssrContext._renderResponse = new Response('Not Found', { status: 404 })
    ssrContext.modules = ssrContext.modules || new Set()
    ssrContext.head = head
    ssrContext.ctx = ctx
    return app
  }

  router.beforeEach((to, from) => __nuxe_runNamedMiddlewares(to, from, ssrContext))

  try {
    await router.push(href)
  } catch (err) {
    if (err && typeof err == 'object' && 'type' in err) {
      // navigation was aborted or redirected; _renderResponse is already set if needed
    } else {
      throw err
    }
  }

  await router.isReady()

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

export default function nuxe(options: NuxeOptions = { layouts: [] }): Plugin {
  const layoutsModule = buildLayoutsModule(options.layouts)
  const clientMiddlewaresModule = generateClientMiddlewaresModule(options.middlewares ?? [])
  const serverMiddlewaresModule = generateServerMiddlewaresModule(options.middlewares ?? [])
  const routesModule = generateRoutesModule(options.pages ?? [])

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
    },

    load(id) {
      if (id === '\0virtual:nuxe/layouts') return layoutsModule
      if (id === '\0virtual:nuxe/middlewares-client') return clientMiddlewaresModule
      if (id === '\0virtual:nuxe/middlewares-server') return serverMiddlewaresModule
      if (id === '\0virtual:nuxe/routes') return routesModule
    },
  }
}
