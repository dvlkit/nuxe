#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../../package.json'), 'utf-8')
)

const command = process.argv[2]

switch (command) {
  case 'dev':
    await import('../lib/cli/dev.js')
    break
  case 'build':
    await import('../lib/cli/build.js')
    break
  case 'start':
    await import('../lib/cli/start.js')
    break
  case '--version':
  case '-v':
    console.log(pkg.version)
    break
  case '--help':
  case '-h':
    console.log(`                                                                                                                                                                                                                    
   vuxe — meta-framework ligero de Vue                                                                                                                                                                                                  
                                                                                                                                                                                                                                        
   Usage:                                                                                                                                                                                                                               
     vuxe dev         Start development server                                                                                                                                                                                          
     vuxe build       Build for production                                                                                                                                                                                              
     vuxe start       Start production server                                                                                                                                                                                           
       `.trim())
    break
  default:
    console.error(`Unknown command: ${command}`)
    console.error('Usage: vuxe <dev|build|start>')
    process.exit(1)
}

export {}