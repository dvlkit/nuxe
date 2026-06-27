import { ViteNodeRunner } from 'vite-node/client'
import {
  renderToWebStream as renderToWebStreamDev,
  type SSRContext as VueSSRContext,
} from 'vue/server-renderer'
import {
  renderSSRHeadShell as renderSSRHeadShellDev,
  renderSSRHeadSuspenseChunk as renderSSRHeadSuspenseChunkDev,
  type createStreamableHead,
} from '@unhead/vue/stream/server'
import {
  createRendererContext,
  getRequestDependencies,
  type RendererContext,
} from 'vue-bundle-renderer/runtime'
import type { Manifest as RendererManifest, ResourceMeta } from 'vue-bundle-renderer'
import type { App } from 'vue'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { createViteNodeClient } from '../vite/vite-node-client.js'
import { serializePayload } from './payload.js'

interface NuxeViteNodeOptions {
  socketPath: string
  root: string
  entryPath: string
}

interface NuxeSSRContext extends VueSSRContext {
  url: string
  modules: Set<string>
  _renderResponse?: Response
  _spa?: boolean
  head?: ReturnType<typeof createStreamableHead>['head']
  ctx?: {
    payload: Record<string, unknown>
    pending: Map<string, Promise<unknown>>
    awaitAll: () => Promise<void>
    routeRules?: import('../pages/scanner').RouteRules
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

function renderErrorResponse(status: number, message: string): Response {
  const title = status === 404 ? 'Not Found' : 'Internal Server Error'
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>${title}</title></head>`
    + `<body style="font-family:sans-serif;padding:2rem"><h1>${status} — ${title}</h1>`
    + `<p>${message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p></body></html>`,
    {
      status,
      headers: { 'Content-Type': 'text/html' },
    },
  )
}

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

function getEntryClientUrl(rendererContext: RendererContext): string {
  const manifest = rendererContext.manifest
  if (!manifest) return '/.nuxe/entry-client.ts'
  for (const meta of Object.values(manifest)) {
    if (meta?.isEntry && meta?.module && meta?.file) {
      return rendererContext.buildAssetsURL(meta.file)
    }
  }
  return '/.nuxe/entry-client.ts'
}

function getEntryClientStyles(rendererContext: RendererContext): string {
  const manifest = rendererContext.manifest
  if (!manifest) return ''
  for (const meta of Object.values(manifest)) {
    if (meta?.isEntry && meta?.css?.length) {
      return meta.css
        .map((file) => `<link rel="stylesheet" crossorigin href="${rendererContext.buildAssetsURL(file)}">`)
        .join('')
    }
  }
  return ''
}

async function loadAppAndManifestDev(
  options: NuxeViteNodeOptions,
  ssrContext: NuxeSSRContext,
): Promise<{ app: App, manifest: RendererManifest, client: ReturnType<typeof createViteNodeClient> }> {
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
    const entry = await runner.executeFile(options.entryPath) as {
      default?: (ssrContext: NuxeSSRContext) => Promise<App> | App
    }
    if (typeof entry.default !== 'function') {
      throw new Error(`[nuxe] entry-server (${options.entryPath}) has no default export function.`)
    }
    const app = await entry.default(ssrContext)
    return { app, manifest, client }
  } catch (error) {
    await client.close()
    throw error
  }
}

async function loadAppAndManifestProd(
  ssrContext: NuxeSSRContext,
): Promise<{ app: App, manifest: RendererManifest }> {
  const serverDir = join(process.cwd(), '.output', 'server')
  const ssrUrl = pathToFileURL(join(serverDir, 'ssr', 'index.js')).href
  const manifestUrl = pathToFileURL(join(serverDir, 'client-manifest.mjs')).href
  const [{ default: createApp }, { default: manifest }] = await Promise.all([
    import(/* @vite-ignore */ ssrUrl),
    import(/* @vite-ignore */ manifestUrl),
  ]) as [
    { default: (ssrContext: NuxeSSRContext) => Promise<App> | App },
    { default: RendererManifest },
  ]
  const app = await createApp(ssrContext)
  return { app, manifest }
}

async function loadRenderDependenciesDev() {
  return {
    renderToWebStream: renderToWebStreamDev,
    renderSSRHeadShell: renderSSRHeadShellDev,
    renderSSRHeadSuspenseChunk: renderSSRHeadSuspenseChunkDev,
  }
}

function loadRenderDependenciesProd() {
  const require = createRequire(join(process.cwd(), 'package.json'))
  return {
    renderToWebStream: require('vue/server-renderer').renderToWebStream,
    renderSSRHeadShell: require('@unhead/vue/stream/server').renderSSRHeadShell,
    renderSSRHeadSuspenseChunk: require('@unhead/vue/stream/server').renderSSRHeadSuspenseChunk,
  }
}

async function renderApp(
  request: Request,
  ssrContext: NuxeSSRContext,
  app: App,
  manifest: RendererManifest,
  updateManifest?: () => Promise<RendererManifest | null>,
): Promise<Response> {
  const isDev = process.env.NODE_ENV !== 'production'

  try {
    const rendererContext = createRendererContext({ manifest })

    if (ssrContext._renderResponse) {
      return ssrContext._renderResponse
    }

    if (ssrContext._spa) {
      const entryUrl = getEntryClientUrl(rendererContext)
      const entryStyles = isDev ? '' : getEntryClientStyles(rendererContext)
      const entryScript = isDev
        ? '<script type="module" src="/.nuxe/entry-client.ts"></script><script type="module" src="/@vite/client"></script>'
        : `<script type="module" src="${entryUrl}"></script>`
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />${entryStyles}</head><body><div id="app"></div>${entryScript}</body></html>`
      return new Response(html, { headers: { 'Content-Type': 'text/html' } })
    }

    const { renderToWebStream, renderSSRHeadShell, renderSSRHeadSuspenseChunk } = isDev
      ? await loadRenderDependenciesDev()
      : loadRenderDependenciesProd()

    const encoder = new TextEncoder()
    const vueStream = renderToWebStream(app, ssrContext as VueSSRContext)
    const reader = vueStream.getReader()

    let firstChunk: Uint8Array | undefined
    try {
      const result = await reader.read()
      if (!result.done) firstChunk = result.value
    } catch (error) {
      reader.releaseLock()
      return renderErrorResponse(500, `[nuxe] Vue renderToWebStream failed on first chunk: ${error instanceof Error ? error.message : String(error)}`)
    }

    if (ssrContext._renderResponse) {
      reader.cancel().catch(() => {})
      return ssrContext._renderResponse
    }

    if (updateManifest) {
      const updatedManifest = await updateManifest()
      if (updatedManifest) rendererContext.updateManifest(updatedManifest)
    }

    const head = ssrContext.head!
    const renderRouteStyles = createRouteStylesTracker()
    const routeStyles = renderRouteStyles(ssrContext, rendererContext)
    const shellHtml = renderSSRHeadShell(
      head,
      '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />'
      + routeStyles
      + '</head><body><div id="app">',
    )

    const entryUrl = getEntryClientUrl(rendererContext)
    const entryScript = isDev
      ? '<script type="module" src="/.nuxe/entry-client.ts"></script><script type="module" src="/@vite/client"></script>'
      : `<script type="module" src="${entryUrl}"></script>`

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
            const serialized = serializePayload(ctx.payload)
            controller.enqueue(encoder.encode(`<script>window.__NUXE__=${serialized};</script>`))
          }

          controller.enqueue(encoder.encode(`${entryScript}${HTML_CLOSE}`))
          controller.close()
        } catch (error) {
          console.error('[nuxe] stream error', error)
          try {
            const message = error instanceof Error ? error.message : String(error)
            controller.enqueue(encoder.encode(
              `<script>document.body.innerHTML='<div style="font-family:sans-serif;padding:2rem">'`
              + `+ '<h1>500 — Error rendering page</h1><p>' + ${JSON.stringify(message)} + '</p></div>'</script>${HTML_CLOSE}`,
            ))
            controller.close()
          } catch {
            controller.error(error)
          }
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
  } catch (error) {
    console.error('[nuxe] render error', error)
    return renderErrorResponse(500, error instanceof Error ? error.message : String(error))
  }
}

export default async function handler(request: Request): Promise<Response> {
  const isDev = process.env.NODE_ENV !== 'production'

  const ssrContext: NuxeSSRContext = {
    url: request.url,
    modules: new Set<string>(),
  } as unknown as NuxeSSRContext

  try {
    if (isDev) {
      const options = loadOptions()
      if (!options) {
        return new Response(
          `[nuxe] Could not read ${SOCKET_STATE_FILE}; the vite-node plugin is missing or failed to start.`,
          { status: 500 },
        )
      }

      const { app, manifest, client } = await loadAppAndManifestDev(options, ssrContext)
      try {
        return await renderApp(request, ssrContext, app, manifest, async () =>
          (await client.manifest() as RendererManifest | null) ?? null,
        )
      } finally {
        await client.close()
      }
    }

    const { app, manifest } = await loadAppAndManifestProd(ssrContext)
    return renderApp(request, ssrContext, app, manifest)
  } catch (error) {
    console.error('[nuxe] handler error', error)
    return renderErrorResponse(500, error instanceof Error ? error.message : String(error))
  }
}
