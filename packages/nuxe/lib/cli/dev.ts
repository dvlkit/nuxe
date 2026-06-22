import {createServer as createViteServer} from 'vite'
import {createServer as createHttpServer} from 'node:http'
import {readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync} from 'node:fs'
import {resolve} from 'node:path'
import vuxe, {DEFAULT_INDEX_HTML} from '../plugin.js'
import vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import {ComponentResolver} from "unplugin-vue-components";
import {transformHtmlTemplate} from '@unhead/vue/server'

const cwd = process.cwd()
const configPath = resolve(cwd, 'vuxe.config.ts')
const mod = await import(configPath)
const userConfig = mod.default ?? {}
const userVite = userConfig.vite ?? {}
const port = Number(userConfig.port ?? process.env.PORT ?? 3000)

const vuxeDir = resolve(cwd, '.vuxe')
const htmlPath = resolve(vuxeDir, 'index.html')
if (!existsSync(htmlPath)) {
  mkdirSync(vuxeDir, {recursive: true})
  writeFileSync(htmlPath, DEFAULT_INDEX_HTML)
}

const layoutsDir = resolve(cwd, 'layouts')
const layoutFiles = existsSync(layoutsDir)
  ? readdirSync(layoutsDir).filter(f => f.endsWith('.vue'))
  : []

const autoImportResolver: ComponentResolver = (componentName) => {
  for (const entry of userConfig.autoImport ?? []) {
    if (entry.names.includes(componentName)) {
      return {name: componentName, from: entry.from}
    }
  }
}

const vite = await createViteServer({
  appType: 'custom',
  server: {middlewareMode: true},
  ...userVite,
  plugins: [
    vue(),
    VueRouter({routesFolder: 'pages', dts: '.vuxe/typed-router.d.ts'}),
    AutoImport({
      imports: ['vue'],
      dirs: ['composables'],
      dts: '.vuxe/auto-imports.d.ts'
    }),
    Components({
      dirs: ['components'],
      dts: '.vuxe/components.d.ts',
      directoryAsNamespace: true,
      resolvers: [autoImportResolver]
    }),
    vuxe({layouts: layoutFiles}),
    ...(userVite.plugins ?? [])
  ]
})

const server = createHttpServer(async (req, res) => {
  vite.middlewares(req, res, async () => {
    const url = req.url || '/'
    try {
      const template = readFileSync(htmlPath, 'utf-8')
      const transformed = await vite.transformIndexHtml(url, template)

      const {render} = await vite.ssrLoadModule('virtual:vuxe/entry-server')
      const {html: appHtml, head} = await render(url)
      let html = transformHtmlTemplate(head, transformed.replace('<div id="app"></div>', `<div id="app">${appHtml}</div>`))

      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html')
      res.end(html)
    } catch (err) {
      vite.ssrFixStacktrace(err as Error)
      res.statusCode = 500
      res.end((err as Error).stack)
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
