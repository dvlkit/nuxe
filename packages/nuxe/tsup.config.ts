import {cpSync} from 'node:fs'
import {execSync} from 'node:child_process'
import {defineConfig} from 'tsup'

export default defineConfig({
  entry: [
    'lib/index.ts',
    'bin/vuxe.ts',
    'lib/entry-server.ts',
    'lib/components/vuxe-layout.ts',
    'lib/cli/dev.ts',
    'lib/cli/build.ts',
    'lib/cli/start.ts',
  ],
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  target: 'node22',
  external: [
    'vue',
    'vue-router',
    'vite',
    '@vitejs/plugin-vue',
    'unplugin-auto-import',
    'unplugin-vue-components',
    '@unhead/vue',
    '@unhead/vue/client',
    '@unhead/vue/server',
    '/app.vue',
    /^virtual:/
  ],
  async onSuccess() {
    execSync('tsc -p tsconfig.dts.json', {stdio: 'inherit'})
    cpSync('lib/virtual-modules.d.ts', 'dist/lib/virtual-modules.d.ts')
  }
})