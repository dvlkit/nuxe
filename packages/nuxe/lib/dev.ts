import { createServer as createHttpServer } from 'node:http'
import { createServer as createViteServer } from 'vite'
import { loadNuxeConfig } from './config'
import { createNuxeProjectSetup } from './nuxe-setup'

export async function runDev(cwd: string): Promise<void> {
  const config = await loadNuxeConfig({ cwd })
  const port = config.server.port
  const setup = await createNuxeProjectSetup(cwd, config)

  const server = createHttpServer()

  const vite = await createViteServer({
    ...setup.baseConfig,
    server: {
      ...setup.baseConfig.server,
      middlewareMode: { server },
    }
  })

  server.on('request', vite.middlewares)

  server.listen(port, () => {
    console.log(`http://localhost:${port}`)
  })

  const shutdown = async () => {
    await vite.close()
    server.close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}