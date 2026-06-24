import { defineCommand } from 'citty'
import { runDev } from '../../dev.js'

export default defineCommand({
  meta: {
    name: 'dev',
    description: 'Start development server'
  },
  async run() {
    await runDev(process.cwd())
  }
})