import { listen } from 'listhen'
import { createServer as createViteServer } from 'vite'
import { loadNuxeConfig } from './config'
import { createNuxeProjectSetup } from './nuxe-setup'
import { prepareLayouts } from './prepare-layouts'
import { printDevBanner } from './utils/banner'
import { logInfo } from './utils/logger'

export async function runDev(cwd: string): Promise<void> {
  process.env.NUXE_DEV = 'true'
  process.env.NODE_ENV = process.env.NODE_ENV || 'development'

  const startedAt = Date.now()
  prepareLayouts(cwd)
  const config = await loadNuxeConfig({ cwd })
  process.env.NUXE_API_PREFIX = config.apiPrefix
  const port = config.server.port
  const setup = await createNuxeProjectSetup(cwd, config)

  const vite = await createViteServer({
    ...setup.baseConfig,
    server: {
      middlewareMode: true,
    }
  })

  process.env.NUXE_DEV = 'true'
  logInfo('starting dev server...')
  const listener = await listen((req, res) => {
    vite.middlewares(req, res)
  }, {
    port,
    showURL: false,
  })

  process.env.NUXE_BASE_URL = listener.url

  printDevBanner(port, Date.now() - startedAt)
}