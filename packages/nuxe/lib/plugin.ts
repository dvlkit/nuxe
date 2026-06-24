import type { Plugin } from 'vite'

const ENTRY_CLIENT_SOURCE = `import { createSSRApp } from 'vue'
import { RouterView, createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { createHead } from '@unhead/vue/client'
import App from '/app/app.vue'

async function main() {
  const head = createHead()
  const app = createSSRApp(App)
  app.use(head)
  const router = createRouter({
    history: createWebHistory(),
    routes,
  })
  app.use(router)
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

import clientAssets from '/.nuxe/entry-client.ts?assets=client'

const HTML_HEAD = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>nuxe</title></head>'
const HTML_BODY_OPEN = '<body><div id="app">'
const HTML_BODY_CLOSE = '</div></body></html>'

function htmlTemplate(body) {
return HTML_HEAD + HTML_BODY_OPEN + body + HTML_BODY_CLOSE
}

async function handler(request) {
  const app = createSSRApp(App)
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })
  app.use(router)

  const url = new URL(request.url)
  const href = url.href.slice(url.origin.length)
  await router.push(href)
  await router.isReady()

  const head = createHead()
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

  return {
    name: 'nuxe:framework',

    resolveId(id) {
      if (id === 'virtual:nuxe/layouts' || id === '\0virtual:nuxe/layouts') {
        return '\0virtual:nuxe/layouts'
      }
    },

    load(id) {
      if (id === '\0virtual:nuxe/layouts') return layoutsModule
    },
  }
}
