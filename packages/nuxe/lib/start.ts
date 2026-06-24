import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { loadNuxeConfig } from './config'

export async function runStart(cwd: string): Promise<void> {
  const config = await loadNuxeConfig({ cwd })
  const port = config.server.port

  const serverPath = resolve(cwd, '.output/server/index.mjs')
  if (!existsSync(serverPath)) {
    console.error(`Nitro server bundle not found at ${serverPath}`)
    console.error(`Run \`nuxe build\` first.`)
    process.exit(1)
  }

  console.log(`Starting nuxe production server on http://localhost:${port}`)

  const child = spawn('node', [serverPath], {
    env: { ...process.env, PORT: String(port), NODE_ENV: 'production' },
    stdio: 'inherit',
  })

  const shutdown = (signal: NodeJS.Signals) => {
    console.log(`\nReceived ${signal}, shutting down...`)
    child.kill(signal)
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Server exited with code ${code}`)
      process.exit(code)
    }
  })
}
