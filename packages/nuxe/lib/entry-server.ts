import { createSSRApp, reactive } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import App from '/app.vue'
import { createHead } from '@unhead/vue/server'

export async function render(url: string): Promise<{ html: string; head: Awaited<ReturnType<typeof createHead>> }> {
  const app = createSSRApp(App)
  const head = createHead()
  app.use(head)

  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })
  app.use(router)
  await router.push(url)
  await router.isReady()

  const html = await renderToString(app)

  return { html, head }
}