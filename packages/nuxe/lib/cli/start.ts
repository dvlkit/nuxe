import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {Hono} from 'hono'
import {serve} from '@hono/node-server'
import {serveStatic} from '@hono/node-server/serve-static'
import {transformHtmlTemplate} from '@unhead/vue/server'

const cwd = process.cwd()
const configPath = resolve(cwd, 'vuxe.config.ts')
const mod = await import(configPath)
const userConfig = mod.default ?? {}
const port = Number(userConfig.port ?? process.env.PORT ?? 3000)

const template = readFileSync(resolve(cwd, 'dist/client/.vuxe/index.html'), 'utf-8')
const {render} = await import(resolve(cwd, 'dist/server/entry-server.js'))

const app = new Hono()

app.use('/assets/*', serveStatic({root: './dist/client'}))

app.get('*', async (c) => {
  try {
    const url = c.req.path
    const {html: appHtml, head} = await render(url)
    const html = transformHtmlTemplate(head, template.replace('<div id="app"></div>', `<div id="app">${appHtml}</div>`))
    return c.html(html)
  } catch (err) {
    console.error(err)
    return c.html(
      `<h1>Internal Server Error</h1><pre>${(err as Error).message}</pre>`,
      500
    )
  }
})

const server = serve({fetch: app.fetch, port}, (info) => {
  console.log(`http://localhost:${info.port}`)
})

const shutdown = async () => {
  console.log('\nShutting down...')
  server.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)