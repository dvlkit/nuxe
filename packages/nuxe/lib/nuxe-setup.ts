import VueRouter from 'vue-router/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { mergeConfig } from 'vite'
import type { PluginOption, UserConfig } from 'vite'
import { NuxeConfig } from './config'
import { resolve } from 'path'
import nuxe, { DEFAULT_INDEX_HTML } from './plugin'
import { ComponentResolver } from 'unplugin-vue-components'
import vue from '@vitejs/plugin-vue'

export interface NuxeProjectSetup {
  htmlPath: string
  layoutFiles: string[]
  autoImportResolver: ComponentResolver
  frameworkPlugins: PluginOption[]
  baseConfig: UserConfig
}

export async function createNuxeProjectSetup(cwd: string, config: NuxeConfig): Promise<NuxeProjectSetup> {
  const nuxeDir = resolve(cwd, '.nuxe')
  const htmlPath = resolve(nuxeDir, 'index.html')
  if (!existsSync(htmlPath)) {
    mkdirSync(nuxeDir, {recursive: true})
    writeFileSync(htmlPath, DEFAULT_INDEX_HTML)
  }

  const layoutsDir = resolve(cwd, 'layouts')
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
    vue(),
    VueRouter({routesFolder: 'pages', dts: '.nuxe/typed-router.d.ts'}),
    AutoImport({
      imports: ['vue'],
      dirs: ['composables'],
      dts: '.nuxe/auto-imports.d.ts',
    }),
    Components({
      dirs: ['components'],
      dts: '.nuxe/components.d.ts',
      directoryAsNamespace: true,
      resolvers: [autoImportResolver]
    }),
    nuxe({layouts: layoutFiles})
  ]

  const baseConfig = mergeConfig({
    root: cwd,
    appType: 'custom',
    server: {middlewareMode: true},
    plugins: frameworkPlugins
  }, config.vite) as UserConfig

  return {
    htmlPath,
    layoutFiles,
    autoImportResolver,
    frameworkPlugins,
    baseConfig
  }
}