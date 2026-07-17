import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const playgroundDir = resolve(__dirname, '../../../../playground')

function waitForPort(port: number, timeout = 15000): Promise<void> {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tryConnect = async () => {
      try {
        const response = await fetch(`http://localhost:${port}/api/ping`)
        if (response.ok) {
          resolve()
          return
        }
      } catch {
        // not ready yet
      }
      if (Date.now() - start > timeout) {
        reject(new Error(`Server did not start on port ${port} within ${timeout}ms`))
        return
      }
      setTimeout(tryConnect, 200)
    }
    tryConnect()
  })
}

describe('playground SSR integration', () => {
  let server: ReturnType<typeof spawn> | null = null
  let port: number

  beforeAll(async () => {
    port = 3000 + Math.floor(Math.random() * 1000)

    execSync('pnpm build', {
      cwd: playgroundDir,
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' },
    })

    server = spawn('node', ['.output/server/index.mjs'], {
      cwd: playgroundDir,
      env: { ...process.env, PORT: String(port), NUXE_DEV: 'false', NODE_ENV: 'production' },
      detached: true,
    })

    await waitForPort(port)
  }, 120_000)

  afterAll(() => {
    if (server && server.pid) {
      try {
        process.kill(-server.pid, 'SIGTERM')
      } catch {
        server.kill('SIGTERM')
      }
    }
  })

  it('serves the home page with SSR', async () => {
    const response = await fetch(`http://localhost:${port}/`)
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('nuxe playground')
    expect(html).toContain('Home')
  })

  it('serves the state page with cookies and SSR payload', async () => {
    const response = await fetch(`http://localhost:${port}/state`, {
      headers: {
        Cookie: 'session=demo123',
        'User-Agent': 'NuxeIntegration/1.0',
      },
    })
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('Session cookie: demo123')
    expect(html).toMatch(/<script(?=[^>]*\bid="__NUXE_DATA__")(?=[^>]*\btype="application\/json")[^>]*>/)
    expect(html).toContain('window.__NUXE__')
  })

  it('serves API routes through nitro', async () => {
    const response = await fetch(`http://localhost:${port}/api/ping`)
    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json.message).toBe('pong')
  })
})

describe('playground runtime config injection', () => {
  let server: ReturnType<typeof spawn> | null = null
  let port: number

  beforeAll(async () => {
    port = 3000 + Math.floor(Math.random() * 1000)

    execSync('pnpm build', {
      cwd: playgroundDir,
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' },
    })

    server = spawn('node', ['.output/server/index.mjs'], {
      cwd: playgroundDir,
      env: {
        ...process.env,
        PORT: String(port),
        NUXE_DEV: 'false',
        NODE_ENV: 'production',
        NUXE_PUBLIC_RUNTIME_INJECTED: 'hello-from-runtime',
      },
      detached: true,
    })

    await waitForPort(port)
  }, 120_000)

  afterAll(() => {
    if (server && server.pid) {
      try {
        process.kill(-server.pid, 'SIGTERM')
      } catch {
        server.kill('SIGTERM')
      }
    }
  })

  it('injects NUXE_PUBLIC_* env vars into window.__NUXE__ at request time', async () => {
    const response = await fetch(`http://localhost:${port}/`)
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('window.__NUXE__')
    const match = html.match(/window\.__NUXE__=([\s\S]*?);<\/script>/)
    expect(match).not.toBeNull()
    expect(match![1]).toContain('hello-from-runtime')
    expect(match![1]).toContain('runtimeInjected')
  })
})
