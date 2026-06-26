import { ViteNodeRunner } from 'vite-node/client'
import {
  renderToWebStream,
  type SSRContext as VueSSRContext,
} from 'vue/server-renderer'
import {
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  createStreamableHead,
} from '@unhead/vue/stream/server'
import {
  createRendererContext,
  getRequestDependencies,
  type RendererContext,
} from 'vue-bundle-renderer/runtime'
import type { Manifest as RendererManifest } from 'vue-bundle-renderer'
import type { App } from 'vue'
import { readFileSync } from 'node:fs'
import { createViteNodeClient } from '../vite/vite-node-client.js'

interface NuxeViteNodeOptions {
  socketPath: string
  root: string
  entryPath: string
}

interface NuxeSSRContext extends VueSSRContext {
  url: string
  modules: Set<string>
  _renderResponse?: Response
  head?: ReturnType<typeof createStreamableHead>['head']
  ctx?: {
    payload: Record<string, unknown>
    pending: Map<string, Promise<unknown>>
    awaitAll: () => Promise<void>
  }
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

const HTML_CLOSE = '</div></body></html>'

function createRouteStylesTracker() {
  const emitted = new Set<string>()
  return (ssrContext: NuxeSSRContext, rendererContext: RendererContext): string => {
    const { styles } = getRequestDependencies(ssrContext as VueSSRContext, rendererContext)
    let html = ''
    for (const key in styles) {
      const resource = styles[key]
      const file = resource.file
      if (emitted.has(file)) continue
      if (file.includes('?inline')) continue
      emitted.add(file)
      const url = rendererContext.buildAssetsURL(file)
      html += `<link rel="stylesheet" crossorigin href="${url}">`
    }
    return html
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

    const manifest = (await client.manifest() as RendererManifest | null) ?? {}
    const rendererContext = createRendererContext({ manifest })

    const ssrContext: NuxeSSRContext = {
      url: request.url,
      modules: new Set<string>(),
    } as unknown as NuxeSSRContext

    const entry = await runner.executeFile(options.entryPath) as {
      default?: (ssrContext: NuxeSSRContext) => Promise<App> | App
    }
    if (typeof entry.default !== 'function') {
      return new Response(
        `[nuxe] entry-server (${options.entryPath}) has no default export function.`,
        { status: 500 },
      )
    }
    const app = await entry.default(ssrContext)

    if (ssrContext._renderResponse) {
      return ssrContext._renderResponse
    }

    const encoder = new TextEncoder()
    const vueStream = renderToWebStream(app, ssrContext as VueSSRContext)
    const reader = vueStream.getReader()

    let firstChunk: Uint8Array | undefined
    try {
      const result = await reader.read()
      if (!result.done) firstChunk = result.value
    } catch {
      reader.releaseLock()
      throw new Error('[nuxe] Vue renderToWebStream failed on first chunk')
    }

    if (ssrContext._renderResponse) {
      reader.cancel().catch(() => {})
      return ssrContext._renderResponse
    }

    const updatedManifest = (await client.manifest() as RendererManifest | null) ?? {}
    rendererContext.updateManifest(updatedManifest)

    const head = ssrContext.head!
    const renderRouteStyles = createRouteStylesTracker()
    const routeStyles = renderRouteStyles(ssrContext, rendererContext)
    const shellHtml = renderSSRHeadShell(
      head,
      '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />'
      + routeStyles
      + '</head><body><div id="app">',
    )

    const htmlStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(shellHtml))

          if (firstChunk) {
            controller.enqueue(firstChunk)
            const lateStyles = renderRouteStyles(ssrContext, rendererContext)
            if (lateStyles) controller.enqueue(encoder.encode(lateStyles))
            const headChunk = renderSSRHeadSuspenseChunk(head)
            if (headChunk) {
              controller.enqueue(encoder.encode(`<script>${headChunk};document.currentScript.remove()</script>`))
            }
          }

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
            const lateStyles = renderRouteStyles(ssrContext, rendererContext)
            if (lateStyles) controller.enqueue(encoder.encode(lateStyles))
            const headChunk = renderSSRHeadSuspenseChunk(head)
            if (headChunk) {
              controller.enqueue(encoder.encode(`<script>${headChunk};document.currentScript.remove()</script>`))
            }
          }

          const ctx = ssrContext.ctx!
          await ctx.awaitAll()
          if (Object.keys(ctx.payload).length > 0) {
            const json = JSON.stringify({ data: ctx.payload }).replace(/</g, '\\u003c')
            controller.enqueue(encoder.encode(`<script>window.__NUXE__=${json};</script>`))
          }

          controller.enqueue(encoder.encode(`<script type="module" src="/.nuxe/entry-client.ts"></script>${HTML_CLOSE}`))
          controller.close()
        } catch (error) {
          controller.error(error)
        } finally {
          reader.releaseLock()
        }
      },
      cancel(reason) {
        reader.cancel(reason).catch(() => {})
      },
    })

    return new Response(htmlStream, {
      headers: {
        'Content-Type': 'text/html',
        'Transfer-Encoding': 'chunked',
      },
    })
  } finally {
    await client.close()
  }
}