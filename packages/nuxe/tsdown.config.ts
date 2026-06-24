import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'lib/index.ts',
    'lib/nuxe-setup.ts',
    'lib/plugin.ts',
    'bin/nuxe.ts',
    'lib/components/nuxe-layout.ts',
    'lib/cli/main.ts',
    'lib/cli/commands/dev.ts',
    'lib/cli/commands/build.ts',
    'lib/cli/commands/start.ts',
  ],
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  target: 'node22',
  deps: {
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
      '/app/app.vue',
      '/app/layouts/',
      /^virtual:/
    ],
  },
  dts: {
    tsconfig: 'tsconfig.dts.json',
  },
  fixedExtension: false,
  copy: [
    {from: 'lib/virtual-modules.d.ts', to: 'dist/lib'}
  ]
})