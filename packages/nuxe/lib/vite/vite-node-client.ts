import { connect, type Socket } from 'node:net'
import {
  type ViteNodeRequestType,
  type ViteNodeRequest,
  type ViteNodeMessage,
} from './vite-node-shared'

const INITIAL_BUFFER_SIZE = 64 * 1024
const MAX_BUFFER_SIZE = 1024 * 1024 * 1024

interface PendingRequest {
  resolve: (data: unknown) => void
  reject: (error: Error) => void
}

interface SocketState {
  buffer: Buffer
  writeOffset: number
  readOffset: number
}

export function createViteNodeClient(socketPath: string): {
  module: (moduleId: string) => Promise<unknown>
  resolve: (id: string, importer?: string) => Promise<unknown>
  manifest: () => Promise<unknown>
  invalidates: () => Promise<unknown>
  close: () => Promise<void>
} {
  let socket: Socket | undefined
  const pending = new Map<number, PendingRequest>()
  let nextId = 0
  const state: SocketState = {
    buffer: Buffer.alloc(INITIAL_BUFFER_SIZE),
    writeOffset: 0,
    readOffset: 0,
  }
  let closed = false

  function connectSocket(): Promise<void> {
    if (socket) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const s = connect(socketPath)
      socket = s
      s.once('connect', () => {
        s.on('data', readMessages)
        s.on('error', (err) => {
          for (const { reject } of pending.values()) reject(err)
          pending.clear()
        })
        s.on('close', () => {
          for (const { reject } of pending.values()) reject(new Error('Socket closed'))
          pending.clear()
        })
        resolve()
      })
      s.once('error', reject)
    })
  }

  function readMessages(chunk: Buffer): void {
    const required = state.writeOffset + chunk.length
    if (required > MAX_BUFFER_SIZE) throw new Error('Client buffer exceeded')
    if (required > state.buffer.length) {
      const next = Buffer.alloc(Math.min(Math.max(state.buffer.length * 2, required), MAX_BUFFER_SIZE))
      state.buffer.copy(next, 0, 0, state.writeOffset)
      state.buffer = next
    }
    chunk.copy(state.buffer, state.writeOffset)
    state.writeOffset += chunk.length

    while (state.writeOffset - state.readOffset >= 4) {
      const length = state.buffer.readUInt32BE(state.readOffset)
      const total = 4 + length
      if (state.writeOffset - state.readOffset < total) return
      const json = state.buffer.subarray(state.readOffset + 4, state.readOffset + total).toString('utf-8')
      state.readOffset += total
      try {
        const message: ViteNodeMessage = JSON.parse(json)
        const handler = pending.get(message.id)
        if (handler) {
          pending.delete(message.id)
          if (message.type === 'error') {
            const err = new Error(message.error.message) as Error & { stack?: string, _fromServer?: boolean }
            if (message.error.stack) err.stack = message.error.stack
            err._fromServer = true
            handler.reject(err)
          } else {
            handler.resolve(message.data)
          }
        }
      } catch {

      }
    }
  }

  function send<T>(type: ViteNodeRequestType, payload?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = nextId++
      pending.set(id, { resolve: resolve as (d: unknown) => void, reject })
      const request: ViteNodeRequest = { id, type, payload }
      const json = JSON.stringify(request)
      const body = Buffer.from(json, 'utf-8')
      const framed = Buffer.alloc(4 + body.length)
      framed.writeUInt32BE(body.length, 0)
      body.copy(framed, 4)
      socket!.write(framed, (err) => {
        if (err) {
          pending.delete(id)
          reject(err)
        }
      })
    })
  }

  return {
    async module(moduleId) {
      await connectSocket()
      return send('module', { moduleId })
    },
    async resolve(id, importer) {
      await connectSocket()
      return send('resolve', { id, importer })
    },
    async manifest() {
      await connectSocket()
      return send('manifest')
    },
    async invalidates() {
      await connectSocket()
      return send('invalidates')
    },
    async close() {
      if (closed) return
      closed = true
      socket?.destroy()
      for (const { reject } of pending.values()) reject(new Error('Client closed'))
      pending.clear()
    },
  }
}
