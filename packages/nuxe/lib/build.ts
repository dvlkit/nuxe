import { createBuilder } from 'vite'
import { loadNuxeConfig } from './config'
import { createNuxeProjectSetup } from './nuxe-setup'
import { prepareLayouts } from './prepare-layouts'

export async function runBuild(cwd: string): Promise<void> {
  prepareLayouts(cwd)
  const config = await loadNuxeConfig({ cwd })
  const setup = await createNuxeProjectSetup(cwd, config)

  const builder = await createBuilder(setup.baseConfig)
  await builder.buildApp()

  console.log('Build complete. Output in .output/')
}
