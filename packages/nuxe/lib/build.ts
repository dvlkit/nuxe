import {build as viteBuild} from 'vite'
import {resolve} from 'path'
import { loadNuxeConfig } from './config'
import { createNuxeProjectSetup } from './nuxe-setup'

export async function runBuild(cwd: string): Promise<void> {
  const config = await loadNuxeConfig({cwd})
  const userBuild = config.vite.build
  const setup = await createNuxeProjectSetup(cwd, config)

  console.log('Building client...')
  await viteBuild({
    ...setup.baseConfig,
    build: {
      outDir: 'dist/client',
      emptyOutDir: true,
      rolldownOptions: {
        input: setup.htmlPath,
      },
      ...userBuild
    }
  })

  console.log('Building server...')
  await viteBuild({
    ...setup.baseConfig,
    build: {
      outDir: 'dist/server',
      ssr: resolve(cwd, 'node_modules/@dvlkit/nuxe/dist/lib/entry-server.js'),
      emptyOutDir: true,
      ...userBuild,
    }
  })

  console.log('Build complete. Output in dist/')
}
