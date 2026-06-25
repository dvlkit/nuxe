import type { Plugin } from 'vite'
import { generateMiddlewaresModule } from './middleware/codegen'
import type { ScannedMiddleware } from './middleware/scanner'

const MIDDLEWARE_CHAIN_SOURCE = `
import { middlewares, globalMiddlewares } from 'virtual:nuxe/middlewares'

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
import App from '/app/app.vue'
${MIDDLEWARE_CHAIN_SOURCE}

async function main() {
  const head = createHead()
  const app = createSSRApp(App)
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
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createHead, transformHtmlTemplate } from '@unhead/vue/server'
import { routes } from 'vue-router/auto-routes'
import App from '/app/app.vue'
${MIDDLEWARE_CHAIN_SOURCE}

import clientAssets from '/.nuxe/entry-client.ts?assets=client'

const HTML_HEAD = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>nuxe</title></head>'
const HTML_BODY_OPEN = '<body><div id="app">'
const HTML_BODY_CLOSE = '</div></body></html>'

function htmlTemplate(body) {
return HTML_HEAD + HTML_BODY_OPEN + body + HTML_BODY_CLOSE
}

async function handler(request) {
  const app = createSSRApp(App)
  const head = createHead()
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

  head.push({
    script: [{ type: 'module', src: clientAssets.entry }],
  })
  
  const renderedApp = await renderToString(app)
  const html = await transformHtmlTemplate(head, htmlTemplate(renderedApp))

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
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
  const middlewaresModule = generateMiddlewaresModule(options.middlewares ?? [])

  return {
    name: 'nuxe:framework',

    resolveId(id) {
      if (id === 'virtual:nuxe/layouts' || id === '\0virtual:nuxe/layouts') {
        return '\0virtual:nuxe/layouts'
      }
      if (id === 'virtual:nuxe/middlewares' || id === '\0virtual:nuxe/middlewares') {
        return '\0virtual:nuxe/middlewares'
      }
    },

    load(id) {
      if (id === '\0virtual:nuxe/layouts') return layoutsModule
      if (id === '\0virtual:nuxe/middlewares') return middlewaresModule
    },
  }
}
