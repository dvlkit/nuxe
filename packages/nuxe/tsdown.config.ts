import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'

import { defineConfig } from 'tsdown'
import type { Plugin } from 'rolldown'

const virtualLayoutsPlugin: Plugin = {
  name: 'nuxe-virtual-layouts',
  resolveId(id) {
    if (id === 'virtual:nuxe/layouts' || id === '\0virtual:nuxe/layouts') {
      return '\0virtual:nuxe/layouts'
    }
  },
  load(id) {
    if (id === '\0virtual:nuxe/layouts') {
      return 'export default {}'
    }
  },
}

export default defineConfig([
  {
    dts: { oxc: false },
    entry: {
      'index': 'lib/index.ts',
      'setup': 'lib/nuxe-setup.ts',
      'plugin': 'lib/plugin.ts',
      'components/nuxe-layout': 'lib/components/nuxe-layout.ts',
    },
    deps: {
      onlyBundle: [],
      neverBundle: [
        'vue',
        'vue-router',
        'vite',
        '@vitejs/plugin-vue',
        'unplugin-auto-import',
        'unplugin-vue-components',
        '@unhead/vue',
        '@unhead/vue/client',
        '@unhead/vue/server',
        'nitro/vite',
        'listhen',
        'c12',
        'valibot',
        'citty',
      ],
    },
    plugins: [virtualLayoutsPlugin],
    hooks: {
      'build:done': async (ctx) => {
        const outDir = ctx.options.outDir
        await copyFile(join(outDir, 'index.mjs'), join(outDir, 'index.js'))
        await copyFile(join(outDir, 'index.d.mts'), join(outDir, 'index.d.ts'))
        await copyFile(join(outDir, 'setup.mjs'), join(outDir, 'setup.js'))
        await copyFile(join(outDir, 'setup.d.mts'), join(outDir, 'setup.d.ts'))
        await copyFile(join(outDir, 'plugin.mjs'), join(outDir, 'plugin.js'))
        await copyFile(join(outDir, 'plugin.d.mts'), join(outDir, 'plugin.d.ts'))
        await copyFile(join(outDir, 'components/nuxe-layout.mjs'), join(outDir, 'components/nuxe-layout.js'),)
        await copyFile(join(outDir, 'components/nuxe-layout.d.mts'), join(outDir, 'components/nuxe-layout.d.ts'),)
        await copyFile('lib/virtual-modules.d.ts', join(outDir, 'lib/virtual-modules.d.ts'))
      },
    },
  },
  {
    unbundle: true,
    fixedExtension: false,
    entry: {
      'bin/nuxe': 'bin/nuxe.ts',
      'cli/main': 'lib/cli/main.ts',
      'cli/commands/dev': 'lib/cli/commands/dev.ts',
      'cli/commands/build': 'lib/cli/commands/build.ts',
      'cli/commands/start': 'lib/cli/commands/start.ts',
    },
    deps: {
      skipNodeModulesBundle: true,
      neverBundle: ['vue-router', 'nitro/vite', 'listhen', 'c12', 'valibot', 'citty'],
    },
  },
])
