import { defineCommand } from 'citty'
import { runBuild } from '../../build.js'

export default defineCommand({
  meta: {
    name: 'build',
    description: 'Build for production'
  },
  async run() {
    await runBuild(process.cwd())
  }
})