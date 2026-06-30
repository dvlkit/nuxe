import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export function prepareLayouts(cwd: string): void {
  const layoutsDir = resolve(cwd, 'app/layouts')
  const layoutFiles = existsSync(layoutsDir)
    ? readdirSync(layoutsDir).filter(f => f.endsWith('.vue'))
    : []

  const nuxeGenDir = resolve(cwd, '.nuxe')
  if (!existsSync(nuxeGenDir)) mkdirSync(nuxeGenDir, {recursive: true})

  const moduleContent = layoutFiles.length === 0
    ? 'export default {}\n'
    : layoutFiles
    .map((f, i) => `import __layout_${i} from '/app/layouts/${f}'`)
    .join('\n') + '\n\nexport default {\n' + layoutFiles
    .map((f, i) => `  '${f.replace(/\.vue$/, '').toLowerCase()}': __layout_${i}`)
    .join(',\n') + '\n}\n'

  writeFileSync(join(nuxeGenDir, 'layouts.mjs'), moduleContent)
}