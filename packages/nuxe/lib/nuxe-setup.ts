import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, join } from 'node:path'
import { mergeConfig } from 'vite'
import type { Plugin, PluginOption, UserConfig } from 'vite'
import { nitro } from 'nitro/vite'
import type { ResolvedNuxeConfig } from './config'
import { scanMiddlewares } from './middleware/scanner'
import nuxe, { NUXE_ENTRY_CLIENT, NUXE_ENTRY_SERVER } from './plugin'
import { scanPlugins } from './plugins/scanner'
import { scanPages } from './pages/scanner'
import { generateTypedRouter } from './pages/typed-router'
import { generateNavigateTo, generateUseRoute } from './pages/generated-composables'
import { generateRuntimeConfigTypes } from './config/generate-runtime-config-types'
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
  if (!plugin?.transform?.handler) return plugin
  const original = plugin.transform.handler
  plugin.transform.handler = function (...args) {
    if (exclude.test(args[1])) return
    return original.call(this, ...args)
  }
  return plugin
}

export async function createNuxeProjectSetup(cwd: string, config: ResolvedNuxeConfig): Promise<NuxeProjectSetup> {
  generateNuxeEntries(cwd)

  const layoutsDir = resolve(cwd, 'app/layouts')
  const layoutFiles = existsSync(layoutsDir)
    ? readdirSync(layoutsDir).filter(f => f.endsWith('.vue'))
    : []
  const scannedMiddlewares = scanMiddlewares(cwd)
  const scannedPages = scanPages(cwd)
  const scannedPlugins = scanPlugins(cwd)
  const hasErrorComponent = existsSync(join(cwd, 'app', 'error.vue'))

  writeFileSync(join(cwd, '.nuxe', 'typed-router.d.ts'), generateTypedRouter(scannedPages))
  writeFileSync(join(cwd, '.nuxe', 'runtime-config.d.ts'), generateRuntimeConfigTypes(config.runtimeConfig))
  writeFileSync(
    join(cwd, '.nuxe', 'runtime-config.json'),
    JSON.stringify({ ...config.runtimeConfigInput, baseUrl: config.baseUrl }, null, 2),
  )
  writeFileSync(
    join(cwd, '.nuxe', 'runtime-config-public.json'),
    JSON.stringify({ public: config.runtimeConfigInput.public ?? {} }, null, 2),
  )

  const nuxeComposablesDir = join(cwd, '.nuxe', 'composables')
  if (!existsSync(nuxeComposablesDir)) {
    mkdirSync(nuxeComposablesDir, { recursive: true })
  }
  writeFileSync(join(nuxeComposablesDir, 'navigateTo.ts'), generateNavigateTo())
  writeFileSync(join(nuxeComposablesDir, 'useNuxeRoute.ts'), generateUseRoute())

  const nodeOnlyExternal = (id: string): boolean =>
    /^(node:|node_modules\/.pnpm\/(c12|chokidar|jiti|exsolve|confbox|pkg-types|readdirp)@)/.test(id)

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
        {
          'vue-router': [
            'useRoute',
            'useRouter',
            'onBeforeRouteLeave',
            'onBeforeRouteUpdate',
          ],
        },
        {'@dvlkit/nuxe/runtime': ['useAsyncData', 'useFetch', '$fetch', 'createFetch']},
        {'@dvlkit/nuxe': ['definePage', 'defineNuxePlugin', 'defineNuxeRouteMiddleware', 'abortNavigation', 'useHead', 'createError', 'showError', 'useError', 'clearError', 'useRuntimeConfig', 'useState', 'useCookie', 'useRequestEvent', 'useRequestHeaders']},
        {'@dvlkit/nuxe/components/client-only': [['default', 'ClientOnly']]},
      ],
      dirs: ['app/composables', '.nuxe/composables'],
      dts: '.nuxe/auto-imports.d.ts',
    }),
    Components({
      dirs: ['app/components'],
      dts: '.nuxe/components.d.ts',
      directoryAsNamespace: true,
    }),
    nuxe({layouts: layoutFiles, cwd, pagesDir: 'app/pages', middlewares: scannedMiddlewares, plugins: scannedPlugins, errorComponent: hasErrorComponent}),
    nitro({
      preset: 'node-server',
      serverDir: 'server',
      renderer: {
        handler: createRequire(join(cwd, 'package.json')).resolve(
          '@dvlkit/nuxe/server/handler',
        ),
      },
      plugins: (() => {
        try {
          return [
            createRequire(join(cwd, 'package.json')).resolve(
              '@dvlkit/nuxe/server/nitro-log-request',
            ),
          ]
        } catch {
          return []
        }
      })(),
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
        '@dvlkit/nuxe/runtime/server-polyfill',
        'vue',
        '@vue/runtime-core',
        '@vue/runtime-dom',
        '@vue/shared',
        '@vue/server-renderer',
        'vue-router',
        '@unhead/vue',
        'unhead',
        'c12',
        'chokidar',
        'jiti',
        'exsolve',
        'pkg-types',
        'readdirp',
        'confbox',
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
            external: nodeOnlyExternal,
          },
        },
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
          },
        },
      },
    },
    server: {middlewareMode: true},
    appType: 'custom',
  }, config.vite) as UserConfig

  return {
    layoutFiles,
    frameworkPlugins,
    baseConfig,
  }
}
