import { ViteNodeRunner } from 'vite-node/client'
import { readFileSync } from 'node:fs'
import { createViteNodeClient } from '../vite/vite-node-client.js'

interface NuxeViteNodeOptions {
  socketPath: string
  root: string
  entryPath: string
}

const SOCKET_STATE_FILE = `${process.cwd()}/.nuxe/vite-node-socket-path`

function loadOptions(): NuxeViteNodeOptions | null {
  try {
    const raw = readFileSync(SOCKET_STATE_FILE, 'utf-8')
    return JSON.parse(raw) as NuxeViteNodeOptions
  } catch {
    return null
  }
}

export default async function handler(request: Request): Promise<Response> {
  const options = loadOptions()
  if (!options) {
    return new Response(
      `[nuxe] Could not read ${SOCKET_STATE_FILE}; the vite-node plugin is missing or failed to start.`,
      { status: 500 },
    )
  }

  const client = createViteNodeClient(options.socketPath)
  try {
    const runner = new ViteNodeRunner({
      root: options.root,
      base: '/',
      resolveId: (id, importer) =>
        client.resolve(id, importer) as Promise<{ id: string } | null | undefined>,
      fetchModule: (id) =>
        client.module(id) as Promise<{ code?: string, externalize?: string }>,
    })

    const entry = await runner.executeFile(options.entryPath) as {
      default?: unknown
    }
    const def = entry.default
    let userHandler: (request: Request) => Promise<Response>
    if (typeof def === 'function') {
      userHandler = def as (request: Request) => Promise<Response>
    }
    else if (def && typeof def === 'object' && 'fetch' in def && typeof (def as { fetch: unknown }).fetch === 'function') {
      userHandler = (def as { fetch: (request: Request) => Promise<Response> }).fetch
    }
    else {
      return new Response(
        `[nuxe] entry-server (${options.entryPath}) has no default export function or { fetch } object.`,
        { status: 500 },
      )
    }
    return await userHandler(request)
  } finally {
    await client.close()
  }
}