import {build as viteBuild} from 'vite'
import vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import nuxe, {DEFAULT_INDEX_HTML} from './plugin.js'
import {existsSync, mkdirSync, readdirSync, writeFileSync} from 'node:fs'
import {resolve} from 'path'
import {ComponentResolver} from "unplugin-vue-components";

export async function runBuild(cwd: string): Promise<void> {
  const userConfigModule = await import(resolve(cwd, 'nuxe.config.ts'))
  const userConfig = userConfigModule.default ?? {}
  const userVite = userConfig.vite ?? {}

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
    for (const entry of userConfig.autoImport ?? []) {
      if (entry.names.includes(componentName)) {
        return {name: componentName, from: entry.from}
      }
    }
  }

  const frameworkPlugins = [
    vue(),
    VueRouter({routesFolder: 'pages', dts: '.nuxe/typed-router.d.ts'}),
    AutoImport({
      imports: ['vue'],
      dirs: ['composables'],
      dts: false,
    }),
    Components({
      dirs: ['components'],
      dts: false,
      directoryAsNamespace: true,
      resolvers: [autoImportResolver]
    }),
    nuxe({layouts: layoutFiles})
  ]

  const baseConfig = {
    root: cwd,
    ...userVite,
    plugins: [
      ...frameworkPlugins,
      ...(userVite.plugins ?? [])
    ]
  }

  console.log('Building client...')
  await viteBuild({
    ...baseConfig,
    build: {
      outDir: 'dist/client',
      emptyOutDir: true,
      rolldownOptions: {
        input: htmlPath,
      },
      ...userVite.build
    }
  })

  console.log('Building server...')
  await viteBuild({
    ...baseConfig,
    build: {
      outDir: 'dist/server',
      ssr: resolve(cwd, 'node_modules/@dvlkit/nuxe/dist/lib/entry-server.js'),
      emptyOutDir: true,
      ...userVite.build
    }
  })

  console.log('Build complete. Output in dist/')
}
