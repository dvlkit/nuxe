import { createServer as createViteServer, mergeConfig } from 'vite'
import { createServer as createHttpServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { transformHtmlTemplate } from '@unhead/vue/server'
import { loadNuxeConfig } from './config'
import { createNuxeProjectSetup } from './nuxe-setup'

export async function runDev(cwd: string): Promise<void> {
  const config = await loadNuxeConfig({cwd})
  const port = config.server.port
  const setup = await createNuxeProjectSetup(cwd, config)

  const vite = await createViteServer(setup.baseConfig)

  const server = createHttpServer(async (req, res) => {
    vite.middlewares(req, res, async () => {
      const url = req.url || '/'

      try {
        const template = readFileSync(setup.htmlPath, 'utf-8')
        const transformed = await vite.transformIndexHtml(url, template)

        const {render} = await vite.ssrLoadModule('virtual:nuxe/entry-server')
        const {html: appHtml, head} = await render(url)
        let html = transformHtmlTemplate(head, transformed.replace('<div id="app"></div>', `<div id="app">${appHtml}</div>`))

        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html')
        res.end(html)
      } catch (err) {
        vite.ssrFixStacktrace(err as Error)
        res.statusCode = 500
      }
    })
  })

  server.listen(port, () => {
    console.log(`http://localhost:${port}`)
  })

  const shutdown = async () => {
    console.log('\nShutting down...')
    await vite.close()
    server.close()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}