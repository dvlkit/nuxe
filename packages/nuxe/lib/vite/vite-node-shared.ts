import { mkdirSync, rmSync, mkdtempSync, chmodSync } from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import { randomUUID } from 'node:crypto'

export interface ViteNodeServerOptions {
  socketPath: string
  root: string
  entryPath: string
  maxRetryAttempts?: number
  baseRetryDelay?: number
  maxRetryDelay?: number
  requestTimeout?: number
}

export type ViteNodeRequestType = 'module' | 'resolve' | 'manifest' | 'invalidates'

export interface ViteNodeRequest<T = unknown> {
  id: number
  type: ViteNodeRequestType
  payload?: T
}

export interface ViteNodeResponse<T = unknown> {
  id: number
  type: 'response'
  data: T
}

export interface ViteNodeErrorResponse {
  id: number
  type: 'error'
  error: {
    message: string
    stack?: string
    status?: number
    data?: unknown
  }
}

export type ViteNodeMessage = ViteNodeResponse | ViteNodeErrorResponse

export interface ModuleRequestPayload {
  moduleId: string
}

export interface ResolveRequestPayload {
  id: string
  importer?: string
}

export function pickSocketPath(): {socketPath: string, parentDir?: string} {
  if (process.platform === 'win32') {
    return {
      socketPath: `\\\\.\\pipe\\nuxe-vite-${randomUUID().slice(0, 8)}`,
    }
  }
  const baseDir = tmpdir()
  let parentDir = mkdtempSync(join(baseDir, 'nuxe-vite-'))
  if (Buffer.byteLength(join(parentDir, 'nuxe.sock')) > 104) {
    parentDir = join('/tmp', `nuxe-vite-${randomUUID().slice(0, 8)}`)
    mkdirSync(parentDir, { mode: 0o700 })
  }
  chmodSync(parentDir, 0o700)
  return { socketPath: join(parentDir, 'nuxe.sock'), parentDir }
}

export function cleanupSocketPath(parentDir: string | undefined): void {
  if (!parentDir) return
  try {
    rmSync(parentDir, { recursive: true, force: true })
  } catch {
  }
}