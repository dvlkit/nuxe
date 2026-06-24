import { defineCommand } from 'citty'
import pkg from '../../package.json' with { type: 'json' }

export const main = defineCommand({
  meta: {
    name: 'nuxe',
    version: pkg.version,
    description: 'Meta-framework de Vue',
  },
  subCommands: {
    dev: () => import('./commands/dev.js').then((m) => m.default),
    build: () => import('./commands/build.js').then((m) => m.default),
    start: () => import('./commands/start.js').then((m) => m.default),
  }
})