import type { Plugin } from 'vite'
import { generateClientMiddlewaresModule, generateServerMiddlewaresModule } from './middleware/codegen'
import type { ScannedMiddleware } from './middleware/scanner'

const MIDDLEWARE_CHAIN_LOGIC = `
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

const ENTRY_CLIENT_SOURCE = `import { createSSRApp } from 'vue'
import { RouterView, createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { createHead } from '@unhead/vue/client'
import { NuxeRoot } from '@dvlkit/nuxe/components/nuxe-root'
import App from '/app/app.vue'
import { middlewares, globalMiddlewares } from 'virtual:nuxe/middlewares-client'
import { setHydratedPayload } from '@dvlkit/nuxe/runtime'
${MIDDLEWARE_CHAIN_LOGIC}

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
import { renderToWebStream } from 'vue/server-renderer'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createStreamableHead } from '@unhead/vue/stream/server'
import { renderSSRHeadShell, renderSSRHeadSuspenseChunk } from '@unhead/vue/stream/server'
import { NuxeRoot } from '@dvlkit/nuxe/components/nuxe-root'
import { routes } from 'vue-router/auto-routes'
import { createRequestContext, runWithContext } from '@dvlkit/nuxe/runtime' 
import App from '/app/app.vue'
import { middlewares, globalMiddlewares } from 'virtual:nuxe/middlewares-server'
${MIDDLEWARE_CHAIN_LOGIC}

const HTML_TEMPLATE_SHELL = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head><body><div id="app">'
const HTML_CLOSE = '<script type="module" src="/.nuxe/entry-client.ts"></script></div></body></html>'

async function handler(request) {
  const ctx = createRequestContext()
  return await runWithContext(ctx, async () => {
    const app = createSSRApp(NuxeRoot, { app: App })
    const { head } = createStreamableHead()
    app.use(head)
    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })
    app.use(router)
  
    let navigationError = null
    router.onError((err) => { navigationError = err })
    router.beforeEach((to, from) => __nuxe_runMiddlewareChain(to, from))
  
    const url = new URL(request.url)
    const href = url.href.slice(url.origin.length)
  
    try {
      await router.push(href)
    } catch (err) {
      if (err && typeof err == 'object' && 'type' in err) {
        navigationError = err
      } else {
        throw err
      }
    }
  
    await router.isReady()
  
    if (navigationError) {
      return new Response('Redirecting', { status: 302, headers: { Location: '/' } })
    }
  
    const vueStream = renderToWebStream(app)
    const reader = vueStream.getReader()
    const encoder = new TextEncoder()
  
    let firstChunk
    try {
      const result = await reader.read()
      if (!result.done) firstChunk = result.value
    } catch (err) {
      reader.releaseLock()
      throw err
    }
  
    const shellWithBodyOpen = renderSSRHeadShell(head, HTML_TEMPLATE_SHELL)
    const htmlStream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(shellWithBodyOpen))
  
          if (firstChunk) {
            controller.enqueue(firstChunk)
            const headChunk = renderSSRHeadSuspenseChunk(head)
            if (headChunk) {
              controller.enqueue(encoder.encode(\`<script>\${headChunk};document.currentScript.remove()</script>\`))
            }
          }
  
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
            const headChunk = renderSSRHeadSuspenseChunk(head)
            if (headChunk) {
              controller.enqueue(encoder.encode(\`<script>\${headChunk};document.currentScript.remove()</script>\`))
            }
          }
          
          await ctx.awaitAll()
          if (Object.keys(ctx.payload).length > 0) {
            const payloadJson = JSON.stringify({data: ctx.payload }).replace(/</g, '\\u003c')
            controller.enqueue(encoder.encode(\`<script>window.__NUXE__=\${payloadJson};</script>\`))
          }
  
          controller.enqueue(encoder.encode(HTML_CLOSE))
          controller.close()
        } catch (error) {
          controller.error(error)
        } finally {
          reader.releaseLock()
        }
      },
      cancel(reason) {
        reader.cancel(reason).catch(() => {})
      }
    })
  
    return new Response(htmlStream, {
      headers: {
        'Content-Type': 'text/html',
        'Transfer-Encoding': 'chunked',
      },
    })
  })
}

export default {
  fetch: handler,
}
`

export const NUXE_ENTRY_SERVER: string = ENTRY_SERVER_SOURCE
export const NUXE_ENTRY_CLIENT: string = ENTRY_CLIENT_SOURCE

export interface NuxeOptions {
  layouts: string[]
  middlewares?: ScannedMiddleware[]
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
    },

    load(id) {
      if (id === '\0virtual:nuxe/layouts') return layoutsModule
      if (id === '\0virtual:nuxe/middlewares-client') return clientMiddlewaresModule
      if (id === '\0virtual:nuxe/middlewares-server') return serverMiddlewaresModule
    },
  }
}
