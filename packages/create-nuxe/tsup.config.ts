import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['lib/index.ts'],
  outDir: 'bin',
  format: ['esm'],
  target: 'node22',
  clean: true,
  bundle: true
})
