import type { Plugin, ViteDevServer } from 'vite'
import { createServer as createNetServer, type Server as NetServer, type Socket } from 'node:net'
import { ViteNodeServer as ViteNodeServerImpl } from 'vite-node/server'
import { chmodSync } from 'node:fs'
import {
  type ViteNodeMessage,
  type ViteNodeRequest,
  type ViteNodeRequestType,
  type ViteNodeServerOptions,
  cleanupSocketPath,
  pickSocketPath
} from './vite-node-shared'

const INITIAL_BUFFER_SIZE = 64 * 1024
const MAX_BUFFER_SIZE = 1024 * 1024 * 1024

interface SocketState {
  buffer: Buffer
  writeOffset: number
  readOffset: number
}

function newSocketState(): SocketState {
  return {
    buffer: Buffer.alloc(INITIAL_BUFFER_SIZE),
    writeOffset: 0,
    readOffset: 0,
  }
}

export function NuxeViteNodePlugin(opts: { root: string, entryPath: string }): Plugin {
  const { socketPath, parentDir } = pickSocketPath()
  const serverOptions: ViteNodeServerOptions = {
    socketPath,
    root: opts.root,
    entryPath: opts.entryPath,
  }

  let netServer: NetServer | undefined
  let viteNodeServer: ViteNodeServerImpl | undefined
  let closed = false

  async function close() {
    if (closed) return
    closed = true
    if (netServer?.listening) {
      await new Promise<void>(resolve => netServer!.close(() => resolve()))
    }
    cleanupSocketPath(parentDir)
  }

  return {
    name: 'nuxe:vite-node-server',
    enforce: 'post',
    apply: () => true,
    configureServer(server: ViteDevServer) {
      viteNodeServer = new ViteNodeServerImpl(server)

      netServer = createNetServer((socket: Socket) => {
        const state = newSocketState()

        socket.on('data', (chunk) => {
          try {
            writeChunk(state, chunk)
            processMessages(state, socket, viteNodeServer!)
          }
          catch (error) {
            socket.destroy(error instanceof Error ? error : new Error(String(error)))
          }
        })

        socket.on('error', () => resetState(state))
        socket.on('close', () => resetState(state))
      })

      const previousUmask = process.umask(0o077)
      try {
        netServer.listen(socketPath, () => {
          try {
            chmodSync(socketPath, 0o600)
          } catch {

          }
        })
      } finally {
        process.umask(previousUmask)
      }

      process.env.NUXE_VITE_NODE_OPTIONS = JSON.stringify(serverOptions)

      server.httpServer?.on('close', close)
      process.once('beforeExit', close)
    },
    async buildEnd() {
      await close()
    }
  }
}

function writeChunk(state: SocketState, chunk: Buffer) {
  ensureCapacity(state, chunk.length)
  chunk.copy(state.buffer, state.writeOffset)
  state.writeOffset += chunk.length
}

function ensureCapacity(state: SocketState, additionalBytes: number): void {
  const required = state.writeOffset + additionalBytes
  if (required > MAX_BUFFER_SIZE) {
    throw new Error(`Socket buffer exceeded ${MAX_BUFFER_SIZE} bytes`)
  }
  if (required <= state.buffer.length) return
  compact(state)
  if (required <= state.buffer.length) return
  const newSize = Math.min(Math.max(state.buffer.length * 2, required), MAX_BUFFER_SIZE)
  const next = Buffer.alloc(newSize)
  state.buffer.copy(next, 0, 0, state.writeOffset)
  state.buffer = next
}

function compact(state: SocketState) {
  if (state.readOffset === 0) return
  const remaining = state.writeOffset - state.readOffset
  if (remaining > 0) {
    state.buffer.copy(state.buffer, 0, state.readOffset, state.writeOffset)
  }
  state.writeOffset = remaining
  state.readOffset = 0
}

function resetState(state: SocketState) {
  state.writeOffset = 0
  state.readOffset = 0
}

async function processMessages(state: SocketState, socket: Socket, node: ViteNodeServerImpl): Promise<void> {
  while (state.writeOffset - state.readOffset >= 4) {
    const messageLength = state.buffer.readUInt32BE(state.readOffset)
    const total = 4 + messageLength
    if (state.writeOffset - state.readOffset < total) return
    const json = state.buffer.subarray(state.readOffset + 4, state.readOffset + total).toString('utf-8')
    state.readOffset += total

    let request: ViteNodeRequest
    try {
      request = JSON.parse(json)
    } catch {
      socket.destroy(new Error('Invalid JSON in IPC message'))
      return
    }

    try {
      const response = await handleRequest(node, request)
      sendMessage(socket, response)
    } catch (error) {
      sendMessage(socket, errorResponse(request.id, error))
    }

    if (state.readOffset > state.buffer.length / 2) compact(state)
  }
}

async function handleRequest(node: ViteNodeServerImpl, request: ViteNodeRequest): Promise<ViteNodeMessage> {
  switch (request.type as ViteNodeRequestType) {
    case 'module': {
      const { moduleId } = request.payload as { moduleId: string }
      const result = await node.fetchModule(moduleId)
      return { id: request.id, type: 'response', data: result }
    }
    case 'resolve': {
      const { id, importer } = request.payload as { id: string, importer?: string }
      const resolved = await node.resolveId(id, importer)
      return { id: request.id, type: 'response', data: resolved }
    }
    case 'manifest':
    case 'invalidates':
      return { id: request.id, type: 'response', data: null }
    default:
      throw new Error(`Unknown request type: ${(request as { type: string }).type}`)
  }
}

function sendMessage(socket: Socket, message: ViteNodeMessage): void {
  const json = JSON.stringify(message)
  const body = Buffer.from(json, 'utf-8')
  const length = body.length
  const framed = Buffer.alloc(4 + length)
  framed.writeUInt32BE(length, 0)
  body.copy(framed, 4)
  socket.write(framed, (err) => {
    if (err) socket.destroy()
  })
}

function errorResponse(id: number, error: unknown): ViteNodeMessage {
  const e = error as { message?: string, stack?: string, status?: number, data?: unknown }
  return {
    id,
    type: 'error',
    error: {
      message: e?.message ?? 'Unknown error',
      stack: e?.stack,
      status: e?.status,
      data: e?.data,
    },
  }
}