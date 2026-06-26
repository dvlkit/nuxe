import { readFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const R = '\x1b[0m'

const C = {
  amber:   (s: string) => `\x1b[38;2;255;140;60m${s}${R}`,
  forest:  (s: string) => `\x1b[38;2;80;200;100m${s}${R}`,
  chalk:   (s: string) => `\x1b[38;2;235;235;240m${s}${R}`,
  mist:    (s: string) => `\x1b[38;2;150;150;165m${s}${R}`,
  bold:    (s: string) => `\x1b[1m${s}${R}`,
  dim:     (s: string) => `\x1b[2m${s}${R}`,
}

const WORDMARK = [
  '███╗   ██╗██╗   ██╗██╗  ██╗███████╗',
  '████╗  ██║██║   ██║╚██╗██╔╝██╔════╝',
  '██╔██╗ ██║██║   ██║ ╚███╔╝ █████╗  ',
  '██║╚██╗██║██║   ██║ ██╔██╗ ██╔══╝  ',
  '██║ ╚████║╚██████╔╝██╔╝ ██╗███████╗',
  '╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝',
].join('\n')

function gradient(text: string, from: readonly [number, number, number], to: readonly [number, number, number]): string {
  const lines = text.split('\n')
  if (lines.length === 1) {
    const [r, g, b] = from
    return `\x1b[38;2;${r};${g};${b}m${text}${R}`
  }
  return lines
    .map((line, i) => {
      const t = i / (lines.length - 1)
      const r = Math.round(from[0] + (to[0] - from[0]) * t)
      const g = Math.round(from[1] + (to[1] - from[1]) * t)
      const b = Math.round(from[2] + (to[2] - from[2]) * t)
      return `\x1b[38;2;${r};${g};${b}m${line}${R}`
    })
    .join('\n')
}

export function getNetworkUrl(
  port: number,
  interfaces: ReturnType<typeof networkInterfaces> = networkInterfaces()
): string | null {
  for (const list of Object.values(interfaces)) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return `http://${net.address}:${port}/`
      }
    }
  }
  return null
}

function isSilent(): boolean {
  return (
    process.env.NUXE_SILENT === 'true' ||
    process.env.CI === 'true' ||
    process.env.VITEST === 'true' ||
    process.env.NODE_ENV === 'test'
  )
}

let VERSION = '0.0.0'

const candidatePaths = (() => {
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    return [
      join(here, '..', '..', 'package.json'),
      join(here, '..', 'package.json'),
      join(here, 'package.json'),
      join(process.cwd(), 'node_modules', '@dvlkit', 'nuxe', 'package.json'),
    ]
  } catch {
    return []
  }
})()

for (const pkgPath of candidatePaths) {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string; name?: string }
    if (pkg.name === '@dvlkit/nuxe' && typeof pkg.version === 'string') {
      VERSION = pkg.version
      break
    }
  } catch {
    // Try the next path.
  }
}

export interface ServerUrls {
  local: string
  network?: string
}

export function printDevBanner(port: number, durationMs?: number): void {
  if (isSilent()) return
  const networkUrl = getNetworkUrl(port)
  const ready = durationMs !== undefined ? C.mist(`ready in ${durationMs}ms`) : ''

  console.log('')
  console.log(gradient(WORDMARK, [255, 140, 60], [80, 200, 100]))
  console.log('')
  console.log(`  ${C.bold('nuxe')} ${C.mist(`v${VERSION}`)}${ready ? '  ' + ready : ''}`)
  console.log('')
  console.log(`  ${C.forest('➜')}  ${C.bold('Local:')}${R}   ${C.amber(`http://localhost:${port}/`)}`)
  if (networkUrl) {
    console.log(`  ${C.forest('➜')}  ${C.bold('Network:')}${R} ${C.amber(networkUrl)}`)
  } else {
    console.log(`  ${C.forest('➜')}  ${C.bold('Network:')}${R} ${C.mist('use --host to expose')}`)
  }
  console.log('')
}

export function logReady(urls: ServerUrls, durationMs: number): void {
  if (isSilent()) return
  console.log(`${C.mist(`ready in ${durationMs}ms`)}`)
  if (urls.local) console.log(`${C.bold('Local:')}${R}   ${C.amber(urls.local)}`)
  if (urls.network) {
    console.log(`${C.bold('Network:')}${R} ${C.amber(urls.network)}`)
  } else {
    console.log(`  ${C.bold('Network:')}${R} ${C.mist('use --host to expose')}`)
  }
  console.log('')
}

export { isSilent, VERSION as NUXE_VERSION }