import type {Plugin} from 'vite'

export const DEFAULT_INDEX_HTML = `<!DOCTYPE html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <title>nuxe app</title>
     </head>
     <body>
       <div id="app"></div>
       <script type="module" src="/virtual:nuxe/entry-client"></script>
     </body>
   </html>
   `

const ROUTER_SOURCE = `                                                                                                                                                                                                              
   import { createRouter, createWebHistory } from 'vue-router'                                                                                                                                                                          
   import { routes } from 'vue-router/auto-routes'                                                                                                                                                                                      
                                                                                                                                                                                                                                        
   export const router = createRouter({                                                                                                                                                                                                 
     history: createWebHistory(),
     routes
   })
`

const ENTRY_SERVER_SOURCE = `
   import { createSSRApp } from 'vue'
   import { renderToString } from 'vue/server-renderer'
   import { createMemoryHistory, createRouter } from 'vue-router'
   import { routes } from 'vue-router/auto-routes'
   import App from '/app.vue'
   import { createHead } from '@unhead/vue/server'

   export async function render(url) {
     const app = createSSRApp(App)
     const head = createHead()
     app.use(head)

     const router = createRouter({
       history: createMemoryHistory(),
       routes
     })

     app.use(router)
     await router.push(url)
     await router.isReady()

     const html = await renderToString(app)
     return { html, head }
   }
`

export interface NuxeOptions {
  layouts: string[]
}

function buildLayoutsModule(layouts: string[]): string {
  if (layouts.length === 0) {
    return 'export default {}\n'
  }
  const imports = layouts
    .map((file, i) => `import __layout_${i} from '/layouts/${file}'`)
    .join('\n')
  const map = layouts
    .map((file, i) => {
      const name = file.replace(/\.vue$/, '').toLowerCase()
      return `  '${name}': __layout_${i}`
    })
    .join(',\n')
  return `${imports}\n\nexport default {\n${map}\n}\n`
}

const ENTRY_CLIENT_SOURCE = `                                                                                                                                                                                                        
   import { createApp } from 'vue'                                                                                                                                                                                                      
   import App from '/app.vue'                                                                                                                                                                                                           
   import { router } from 'virtual:nuxe/router'                                                                                                                                                                                        
   import { createHead } from '@unhead/vue/client'                                                                                                                                                                                      
                                                                                                                                                                                                                                        
   const app = createApp(App)                                                                                                                                                                                                           
   const head = createHead()                                                                                                                                                                                                            
   app.use(head)                                                                                                                                                                                                                        
   app.use(router)                                                                                                                                                                                                                      
   app.mount('#app')                                                                                                                                                                                                                    
   `

export default function nuxe(options: NuxeOptions = {layouts: []}): Plugin {
  const layoutsModule = buildLayoutsModule(options.layouts)

  return {
    name: 'nuxe:framework',

    resolveId(id) {
      if (
        id === 'virtual:nuxe/entry-client' ||
        id === '/@id/virtual:nuxe/entry-client' ||
        id === '/virtual:nuxe/entry-client'
      ) return '\0virtual:nuxe/entry-client'

      if (
        id === 'virtual:nuxe/router' ||
        id === '/@id/virtual:nuxe/router' ||
        id === '/virtual:nuxe/router'
      ) return '\0virtual:nuxe/router'

      if (id === 'virtual:nuxe/entry-server') return '\0virtual:nuxe/entry-server'

      if (id === 'virtual:nuxe/layouts' || id === '\0virtual:nuxe/layouts') {
        return '\0virtual:nuxe/layouts'
      }
    },

    load(id) {
      if (id === '\0virtual:nuxe/entry-client') return ENTRY_CLIENT_SOURCE
      if (id === '\0virtual:nuxe/router') return ROUTER_SOURCE
      if (id === '\0virtual:nuxe/entry-server') return ENTRY_SERVER_SOURCE
      if (id === '\0virtual:nuxe/layouts') return layoutsModule
    },

    transformIndexHtml() {
      return []
    }
  }
}
