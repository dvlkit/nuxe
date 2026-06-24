import { defineCommand } from 'citty'
import { runStart } from '../../start.js'

export default defineCommand({
  meta: {
    name: 'start',
    description: 'Start production server'
  },
  async run() {
    await runStart(process.cwd())
  }
})
