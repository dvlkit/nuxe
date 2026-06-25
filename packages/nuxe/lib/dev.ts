import { listen } from 'listhen'
import { createServer as createViteServer } from 'vite'
import { loadNuxeConfig } from './config'
import { createNuxeProjectSetup } from './nuxe-setup'
import { prepareLayouts } from './prepare-layouts'

export async function runDev(cwd: string): Promise<void> {
  prepareLayouts(cwd)
  const config = await loadNuxeConfig({ cwd })
  const port = config.server.port
  const setup = await createNuxeProjectSetup(cwd, config)

  const vite = await createViteServer({
    ...setup.baseConfig,
    server: {
      middlewareMode: true,
    }
  })

  const listener = await listen((req, res) => {
    vite.middlewares(req, res)
  }, {
    port,
    showURL: true,
  })

  process.env.NUXE_BASE_URL = listener.url
}