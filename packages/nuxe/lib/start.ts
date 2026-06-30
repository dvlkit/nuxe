import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { loadNuxeConfig, setupRuntimeEnv } from './config'
import { printDevBanner } from './utils/banner'
import { logInfo } from './utils/logger'

export async function runStart(cwd: string): Promise<void> {
  await setupRuntimeEnv(cwd)
  const config = await loadNuxeConfig({ cwd })
  const port = config.server.port

  const serverPath = resolve(cwd, '.output/server/index.mjs')
  if (!existsSync(serverPath)) {
    console.error(`Nitro server bundle not found at ${serverPath}`)
    console.error(`Run \`nuxe build\` first.`)
    process.exit(1)
  }

  logInfo('starting production server...')
  process.env.PORT = String(port)
  process.env.NODE_ENV = 'production'
  process.env.NUXE_DEV = 'false'
  process.env.NUXE_BASE_URL = process.env.NUXE_BASE_URL ?? `http://localhost:${port}`

  printDevBanner(port)

  await import(pathToFileURL(serverPath).href)

  const shutdown = (signal: NodeJS.Signals) => {
    logInfo(`received ${signal}, shutting down...`)
    clearInterval(keepAlive)
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  const keepAlive = setInterval(() => {
  }, 60_000)
}