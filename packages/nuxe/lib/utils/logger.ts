import { createLogger } from '@nijil71/lumi-cli'

const R = '\x1b[0m'

const C = {
  amber:  (s: string) => `\x1b[38;2;255;185;40m${s}${R}`,
  signal: (s: string) => `\x1b[38;2;255;80;60m${s}${R}`,
  forest: (s: string) => `\x1b[38;2;80;200;140m${s}${R}`,
  mist:   (s: string) => `\x1b[38;2;150;150;165m${s}${R}`,
  chalk:  (s: string) => `\x1b[38;2;235;235;240m${s}${R}`,
  azure:  (s: string) => `\x1b[38;2;60;160;255m${s}${R}`,
  bold:   (s: string) => `\x1b[1m${s}${R}`,
}

function isSilent(): boolean {
  return (
    process.env.NUXE_SILENT === 'true' ||
    process.env.CI === 'true' ||
    process.env.VITEST === 'true' ||
    process.env.NODE_ENV === 'test'
  )
}

const logger = createLogger({ prefix: 'nuxe' })

export function logInfo(message: string): void {
  if (isSilent()) return
  logger.info(message)
}

export function logSuccess(message: string): void {
  if (isSilent()) return
  logger.success(message)
}

export function logWarn(message: string): void {
  if (isSilent()) return
  logger.warn(message)
}

export function logError(message: string): void {
  if (isSilent()) return
  logger.error(message)
}

function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-GB', { hour12: false })
}

function methodColor(method: string): (s: string) => string {
  switch (method) {
    case 'GET':    return C.azure
    case 'POST':
    case 'PUT':
    case 'PATCH': return C.amber
    case 'DELETE': return C.signal
    default:       return C.mist
  }
}

function statusColor(status: number): (s: string) => string {
  if (status >= 500) return C.signal
  if (status >= 400) return C.amber
  if (status >= 300) return C.azure
  if (status >= 200) return C.forest
  return C.mist
}

function durationColor(ms: number): (s: string) => string {
  if (ms > 1000) return C.signal
  if (ms > 300) return C.amber
  return C.mist
}

function truncate(s: string, max = 60): string {
  if (s.length <= max) return s
  return `${s.slice(0, max - 3)}...`
}

export function logRequest(
  method: string,
  url: string,
  status: number,
  durationMs: number,
  label?: string,
  pagePath?: string,
): void {
  if (isSilent()) return

  const time = C.mist(formatTime())
  const methodPadded = method.padEnd(6)
  const pathPadded = truncate(url, 60).padEnd(60)

  let labelText = ''
  if (label) {
    const base = ` (${label}`
    labelText = C.mist(`${base}${pagePath ? ` on ${pagePath}` : ''})`)
  }

  console.log(
    `${C.mist('[nuxe]')} ${time} ${C.amber('▸')} ${methodColor(method)(methodPadded)} ${pathPadded} ${statusColor(status)(String(status).padStart(3))}  ${durationColor(durationMs)(`${durationMs}ms`.padStart(5))}${labelText}`,
  )
}

export { isSilent }