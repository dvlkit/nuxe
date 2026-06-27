import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, join } from 'node:path'
import { mergeConfig } from 'vite'
import type { PluginOption, UserConfig } from 'vite'
import { nitro } from 'nitro/vite'
import { NuxeConfig } from './config'
import { scanMiddlewares } from './middleware/scanner'
import nuxe, { NUXE_ENTRY_CLIENT, NUXE_ENTRY_SERVER } from './plugin'
import { scanPages } from './pages/scanner'
import nuxePageMetaPlugin from './pages/page-meta-plugin'
import vue from '@vitejs/plugin-vue'
import { NuxeViteNodePlugin } from './vite/vite-node-server'
import { NuxeClientManifestPlugin } from './vite/client-manifest'
import { NuxeDevStyleSSRPlugin } from './vite/dev-style-ssr'

export interface NuxeProjectSetup {
  layoutFiles: string[]
  frameworkPlugins: PluginOption[]
  baseConfig: UserConfig
}

function generateNuxeEntries(cwd: string): void {
  const nuxeDir = join(cwd, '.nuxe')
  if (!existsSync(nuxeDir)) {
    mkdirSync(nuxeDir, {recursive: true})
  }
  writeFileSync(join(nuxeDir, 'entry-server.ts'), NUXE_ENTRY_SERVER)
  writeFileSync(join(nuxeDir, 'entry-client.ts'), NUXE_ENTRY_CLIENT)
}

// Workaround for https://github.com/vitejs/vite-plugin-vue/issues/677
type VuePlugin = Plugin & {
  transform: {
    handler: (code: string, id: string, options?: unknown) => unknown
  }
}

function patchVueExclude(plugin: VuePlugin, exclude: RegExp) {
  if (!plugin.transform?.handler) return plugin
  const original = plugin.transform.handler
  plugin.transform.handler = function (...args) {
    if (exclude.test(args[1])) return
    return original.call(this, ...args)
  }
  return plugin
}

export async function createNuxeProjectSetup(cwd: string, config: NuxeConfig): Promise<NuxeProjectSetup> {
  generateNuxeEntries(cwd)

  const layoutsDir = resolve(cwd, 'app/layouts')
  const layoutFiles = existsSync(layoutsDir)
    ? readdirSync(layoutsDir).filter(f => f.endsWith('.vue'))
    : []
  const scannedMiddlewares = scanMiddlewares(cwd)
  const scannedPages = scanPages(cwd)

  const frameworkPlugins: PluginOption[] = [
    patchVueExclude(vue() as VuePlugin, /\?assets/),
    nuxePageMetaPlugin(),
    NuxeViteNodePlugin({
      root: cwd,
      entryPath: join(cwd, '.nuxe', 'entry-server.ts'),
    }),
    NuxeClientManifestPlugin({
      clientEntry: join(cwd, '.nuxe', 'entry-client.ts'),
      serverOutDir: join(cwd, '.output', 'server'),
    }),
    NuxeDevStyleSSRPlugin({ root: cwd }),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        {'@dvlkit/nuxe/runtime': ['useAsyncData', 'useFetch', '$fetch', 'createFetch']},
        {'@dvlkit/nuxe': ['definePage', 'defineNuxeRouteMiddleware', 'navigateTo', 'abortNavigation']},
      ],
      dirs: ['app/composables'],
      dts: '.nuxe/auto-imports.d.ts',
    }),
    Components({
      dirs: ['app/components'],
      dts: '.nuxe/components.d.ts',
      directoryAsNamespace: true,
    }),
    nuxe({layouts: layoutFiles, middlewares: scannedMiddlewares, pages: scannedPages}),
    nitro({
      preset: 'node-server',
      serverDir: 'server',
      renderer: {
        handler: createRequire(join(cwd, 'package.json')).resolve(
          '@dvlkit/nuxe/server/handler',
        ),
      },
    } as Parameters<typeof nitro>[0]),
  ]

  const baseConfig = mergeConfig({
    root: cwd,
    resolve: {
      alias: {
        '#nuxe': resolve(cwd, '.nuxe'),
      },
    },
    optimizeDeps: {
      force: true,
      exclude: [
        '@dvlkit/nuxe',
        '@dvlkit/nuxe/runtime',
        '@dvlkit/nuxe/server',
        '@dvlkit/nuxe/server/handler',
        '@dvlkit/nuxe/runtime/server/handler',
        'vue',
        '@vue/runtime-core',
        '@vue/runtime-dom',
        '@vue/shared',
        '@vue/server-renderer',
        'vue-router',
        '@unhead/vue',
        'unhead',
      ],
    },
    plugins: frameworkPlugins,
    environments: {
      client: {
        consumer: 'client',
        keepProcessEnv: false,
        build: {
          manifest: true,
          rollupOptions: {
            input: join(cwd, '.nuxe', 'entry-client.ts'),
          }
        }
      },
      ssr: {
        consumer: 'server',
        define: {
          'process.server': true,
          'process.client': false,
          'process.browser': false,
          'import.meta.server': true,
          'import.meta.client': false,
          'import.meta.browser': false,
          'window': 'undefined',
          'document': 'undefined',
          'navigator': 'undefined',
          'location': 'undefined',
          'XMLHttpRequest': 'undefined',
        },
        build: {
          outDir: join(cwd, '.output', 'server', 'ssr'),
          rollupOptions: {
            input: join(cwd, '.nuxe', 'entry-server.ts'),
          }
        }
      },
    },
    server: {middlewareMode: true},
    appType: 'custom',
  }, config.vite) as UserConfig

  return {
    layoutFiles,
    frameworkPlugins,
    baseConfig
  }
}
