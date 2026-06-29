import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    dts: { oxc: false },
    entry: {
      'index': 'lib/index.ts',
      'setup': 'lib/nuxe-setup.ts',
      'plugin': 'lib/plugin.ts',
      'components/client-only': 'lib/components/client-only.ts',
      'components/nuxe-layout': 'lib/components/nuxe-layout.ts',
      'components/nuxe-root': 'lib/components/nuxe-root.ts',
      'runtime/index': 'lib/runtime/index.ts',
      'server/index': 'lib/server/index.ts',
      'server/handler': 'lib/server/handler.ts',
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
        '#nuxe/layouts.mjs',
        './ssr/index.js',
        './client.manifest.mjs',
      ],
    },
    hooks: {
      'build:done': async (ctx) => {
        const outDir = ctx.options.outDir
        await copyFile(join(outDir, 'index.mjs'), join(outDir, 'index.js'))
        await copyFile(join(outDir, 'index.d.mts'), join(outDir, 'index.d.ts'))
        await copyFile(join(outDir, 'setup.mjs'), join(outDir, 'setup.js'))
        await copyFile(join(outDir, 'setup.d.mts'), join(outDir, 'setup.d.ts'))
        await copyFile(join(outDir, 'plugin.mjs'), join(outDir, 'plugin.js'))
        await copyFile(join(outDir, 'plugin.d.mts'), join(outDir, 'plugin.d.ts'))
        await copyFile(join(outDir, 'components/client-only.mjs'), join(outDir, 'components/client-only.js'))
        await copyFile(join(outDir, 'components/client-only.d.mts'), join(outDir, 'components/client-only.d.ts'))
        await copyFile(join(outDir, 'components/nuxe-layout.mjs'), join(outDir, 'components/nuxe-layout.js'))
        await copyFile(join(outDir, 'components/nuxe-layout.d.mts'), join(outDir, 'components/nuxe-layout.d.ts'))
        await copyFile(join(outDir, 'components/nuxe-root.mjs'), join(outDir, 'components/nuxe-root.js'))
        await copyFile(join(outDir, 'components/nuxe-root.d.mts'), join(outDir, 'components/nuxe-root.d.ts'))
        await copyFile(join(outDir, 'runtime/index.mjs'), join(outDir, 'runtime/index.js'))
        await copyFile(join(outDir, 'runtime/index.d.mts'), join(outDir, 'runtime/index.d.ts'))
        await copyFile(join(outDir, 'server/index.mjs'), join(outDir, 'server/index.js'))
        await copyFile(join(outDir, 'server/index.d.mts'), join(outDir, 'server/index.d.ts'))
        await copyFile(join(outDir, 'server/handler.mjs'), join(outDir, 'server/handler.js'))
        await copyFile(join(outDir, 'server/handler.d.mts'), join(outDir, 'server/handler.d.ts'))
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
