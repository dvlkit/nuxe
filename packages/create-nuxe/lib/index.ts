#!/usr/bin/env node
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const TEMPLATE_DIR = resolve(__dirname, '../lib/template')

const projectName = process.argv[2]

if (!projectName) {
  console.error('Usage: create-nuxe <project-name>')
  process.exit(1)
}

if (!/^[a-z0-9-_]+$/i.test(projectName)) {
  console.error(`Error: invalid project name "${projectName}"`)
  console.error('Use only letters, numbers, dashes, and underscores')
  process.exit(1)
}

const projectDir = resolve(process.cwd(), projectName)

if (existsSync(projectDir)) {
  console.error(`Error: directory "${projectName}" already exists`)
  process.exit(1)
}

console.log(`\nCreating ${projectName}...`)

cpSync(TEMPLATE_DIR, projectDir, { recursive: true })

const pkgPath = join(projectDir, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
pkg.name = projectName
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

console.log(`\n✓ Created ${projectName}/\n`)
console.log('Next steps:')
console.log(`  cd ${projectName}`)
console.log(`  pnpm install`)
console.log(`  pnpm dev`)
console.log('\nOpen http://localhost:3000\n')
