import { createBuilder } from 'vite'
import { cp } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { loadNuxeConfig } from './config'
import { createNuxeProjectSetup } from './nuxe-setup'
import { prepareLayouts } from './prepare-layouts'
import { scanPages } from './pages/scanner'
import { logInfo, logSuccess, logWarn } from './utils/logger'

async function prerenderRoutes(cwd: string): Promise<void> {
  const pages = scanPages(cwd)
  const prerenderPages = pages.filter((p) => p.routeRules?.prerender)
  if (prerenderPages.length === 0) return

  logInfo(`prerendering ${prerenderPages.length} route(s)...`)

  const nuxeHandler = (await import('./server/handler.js')).default as (
    request: Request,
  ) => Promise<Response>
  const publicDir = join(cwd, '.output/public')

  for (const page of prerenderPages) {
    const targetPath = typeof page.routeRules!.prerender === 'string'
      ? page.routeRules!.prerender
      : page.path

    const response = await nuxeHandler(new Request(`http://localhost${targetPath}`))
    const html = await response.text()

    const filePath = targetPath === '/' ? join(publicDir, 'index.html') : join(publicDir, targetPath, 'index.html')
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, html)
    logInfo(`  prerendered ${targetPath} -> ${filePath}`)
  }
}

export async function runBuild(cwd: string): Promise<void> {
  const startedAt = Date.now()
  prepareLayouts(cwd)
  const config = await loadNuxeConfig({ cwd })
  const setup = await createNuxeProjectSetup(cwd, config)

  logInfo('building for production...')

  const builder = await createBuilder(setup.baseConfig)
  await builder.buildApp()

  const ssrBuildDir = resolve(cwd, 'node_modules/.nitro/vite/services/ssr')
  const ssrOutDir = resolve(cwd, '.output/server/ssr')
  if (existsSync(ssrBuildDir)) {
    await cp(ssrBuildDir, ssrOutDir, { recursive: true, force: true })
  } else {
    logWarn('SSR build output not found; production SSR may be unavailable')
  }

  await prerenderRoutes(cwd)

  logSuccess(`build complete in ${Date.now() - startedAt}ms`)
}
