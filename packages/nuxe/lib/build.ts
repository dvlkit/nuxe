import { createBuilder } from 'vite'
import { cp } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadNuxeConfig } from './config'
import { createNuxeProjectSetup } from './nuxe-setup'
import { prepareLayouts } from './prepare-layouts'
import { logInfo, logSuccess, logWarn } from './utils/logger'

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

  logSuccess(`build complete in ${Date.now() - startedAt}ms`)
}
