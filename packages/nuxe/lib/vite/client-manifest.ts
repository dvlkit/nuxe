import type { Manifest as ViteClientManifest, Plugin, ViteDevServer } from 'vite'
import { type Manifest as RendererManifest, normalizeViteManifest, precomputeDependencies } from 'vue-bundle-renderer'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

const IS_CSS_RE = /\.css(?:\?[^.]*)?$/

const NUXE_MANIFEST = 'client-manifest.mjs'
const NUXE_PRECOMPUTED = 'client-precomputed.mjs'

interface NuxeClientManifestPluginOptions {
  clientEntry: string
  serverOutDir: string
}

interface DevManifestState {
  manifest: RendererManifest
  dirty: boolean
  server?: ViteDevServer
  clientEntryRelative?: string
}

const devManifestState: DevManifestState = { manifest: {}, dirty: true }

function collectSsrCss(server: ViteDevServer): string[] {
  const css = new Set<string>()
  const ssr = server.environments.ssr
  for (const key of ssr.moduleGraph.urlToModuleMap.keys()) {
    if (!IS_CSS_RE.test(key)) continue
    if (key.includes('?inline') || key.includes('?raw')) continue
    css.add(key)
  }
  return [...css]
}

function buildDevManifest(server: ViteDevServer, clientEntryRelative: string): RendererManifest {
  const css = collectSsrCss(server)

  return normalizeViteManifest({
    '/@vite/client': {
      file: '/@vite/client',
      css,
      module: true,
      isEntry: true,
      resourceType: 'script',
      preload: true,
      prefetch: true,
    },
    [clientEntryRelative]: {
      file: clientEntryRelative,
      module: true,
      isEntry: true,
      resourceType: 'script',
      preload: true,
      prefetch: true,
    },
  })
}

export function getDevManifest(): RendererManifest {
  if (devManifestState.dirty || !devManifestState.server || !devManifestState.clientEntryRelative) {
    devManifestState.dirty = false
    return devManifestState.manifest
  }
  devManifestState.manifest = buildDevManifest(devManifestState.server, devManifestState.clientEntryRelative)
  return devManifestState.manifest
}

export function refreshDevManifest(server: ViteDevServer, clientEntryRelative: string): void {
  devManifestState.server = server
  devManifestState.clientEntryRelative = clientEntryRelative
  devManifestState.manifest = buildDevManifest(server, clientEntryRelative)
  devManifestState.dirty = false
}

export function NuxeClientManifestPlugin(opts: NuxeClientManifestPluginOptions): Plugin {
  let viteRoot: string
  let clientEntryRelative: string

  async function writeProdOutputs(manifest: RendererManifest): Promise<void> {
    await mkdir(opts.serverOutDir, { recursive: true })
    const precomputed = precomputeDependencies(manifest)
    await writeFile(resolve(opts.serverOutDir, NUXE_MANIFEST), `export default ${JSON.stringify(manifest)}`, 'utf-8')
    await writeFile(resolve(opts.serverOutDir, NUXE_PRECOMPUTED), `export default ${JSON.stringify(precomputed)}`, 'utf-8')
  }

  return {
    name: 'nuxe:client-manifest',
    enforce: 'post',
    apply: () => true,

    configResolved(config) {
      viteRoot = config.root
      clientEntryRelative = '/' + relative(viteRoot, opts.clientEntry).replace(/\\/g, '/')
    },

    configureServer(server) {
      refreshDevManifest(server, clientEntryRelative)
    },

    async closeBundle(_options) {
      if (this.environment?.name !== 'client') return
      try {
        const manifestFile = resolve(viteRoot, '.output/public/.vite/manifest.json')
        const raw = await readFile(manifestFile, 'utf-8')
        const clientManifest = JSON.parse(raw) as ViteClientManifest
        const normalized = normalizeViteManifest(clientManifest)
        await writeProdOutputs(normalized)
      } catch (err) {
        this.warn?.(`[nuxe:client-manifest] failed to write production manifest: ${(err as Error).message}`)
      }
    },
  }
}

export async function loadProdClientManifest(serverOutDir: string): Promise<{
  manifest: RendererManifest | null
  precomputed: ReturnType<typeof precomputeDependencies> | null
}> {
  try {
    const manifestRaw = await readFile(resolve(serverOutDir, NUXE_MANIFEST), 'utf-8')
    const precomputedRaw = await readFile(resolve(serverOutDir, NUXE_PRECOMPUTED), 'utf-8')
    return {
      manifest: JSON.parse(manifestRaw) as RendererManifest,
      precomputed: JSON.parse(precomputedRaw) as ReturnType<typeof precomputeDependencies>,
    }
  } catch {
    return { manifest: null, precomputed: null }
  }
}

export type { RendererManifest }