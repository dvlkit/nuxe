import VueRouter from 'vue-router/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { mergeConfig } from 'vite'
import type { PluginOption, UserConfig } from 'vite'
import { nitro } from 'nitro/vite'
import { NuxeConfig } from './config'
import nuxe, { NUXE_ENTRY_CLIENT, NUXE_ENTRY_SERVER } from './plugin'
import { ComponentResolver } from 'unplugin-vue-components'
import vue from '@vitejs/plugin-vue'

export interface NuxeProjectSetup {
  layoutFiles: string[]
  autoImportResolver: ComponentResolver
  frameworkPlugins: PluginOption[]
  baseConfig: UserConfig
}

function generateNuxeEntries(cwd: string): void {
  const nuxeDir = join(cwd, '.nuxe')
  if (!existsSync(nuxeDir)) {
    mkdirSync(nuxeDir, { recursive: true })
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

  const autoImportResolver: ComponentResolver = (componentName) => {
    for (const entry of config.autoImport ?? []) {
      if (entry.names.includes(componentName)) {
        return {name: componentName, from: entry.from}
      }
    }
  }

  const frameworkPlugins: PluginOption[] = [
    patchVueExclude(vue() as VuePlugin, /\?assets/),
    VueRouter({routesFolder: 'app/pages', dts: '.nuxe/typed-router.d.ts'}),
    AutoImport({
      imports: ['vue'],
      dirs: ['app/composables'],
      dts: '.nuxe/auto-imports.d.ts',
    }),
    Components({
      dirs: ['app/components'],
      dts: '.nuxe/components.d.ts',
      directoryAsNamespace: true,
      resolvers: [autoImportResolver]
    }),
    nuxe({layouts: layoutFiles}),
    nitro({ preset: 'node-server' }),
  ]

  const baseConfig = mergeConfig({
    root: cwd,
    plugins: frameworkPlugins,
    environments: {
      client: {
        consumer: 'client',
        keepProcessEnv: false,
        build: {
          rollupOptions: {
            input: join(cwd, '.nuxe', 'entry-client.ts'),
          }
        }
      },
      ssr: {
        consumer: 'server',
        build: {
          rollupOptions: {
            input: join(cwd, '.nuxe', 'entry-server.ts'),
          }
        }
      },
    },
    server: { middlewareMode: true },
    appType: 'custom',
  }, config.vite) as UserConfig

  return {
    layoutFiles,
    autoImportResolver,
    frameworkPlugins,
    baseConfig
  }
}
