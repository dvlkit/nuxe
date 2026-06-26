import { createBuilder } from 'vite'
import { loadNuxeConfig } from './config'
import { createNuxeProjectSetup } from './nuxe-setup'
import { prepareLayouts } from './prepare-layouts'
import { logInfo, logSuccess } from './utils/logger'

export async function runBuild(cwd: string): Promise<void> {
  const startedAt = Date.now()
  prepareLayouts(cwd)
  const config = await loadNuxeConfig({ cwd })
  const setup = await createNuxeProjectSetup(cwd, config)

  logInfo('building for production...')

  const builder = await createBuilder(setup.baseConfig)
  await builder.buildApp()

  logSuccess(`build complete in ${Date.now() - startedAt}ms`)
}
