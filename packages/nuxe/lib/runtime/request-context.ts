interface AsyncLocalStorageLike<T> {
  run<U>(store: T, fn: () => U): U
  getStore(): T | undefined
}

let storage: AsyncLocalStorageLike<NuxeRequestContext> | undefined

if (typeof globalThis !== 'undefined' && (globalThis as any).process?.versions?.node) {
  const { AsyncLocalStorage } = await import('node:async_hooks')
  storage = new AsyncLocalStorage<NuxeRequestContext>()
}

export interface NuxeRequestContext {
  payload: Record<string, unknown>
  pending: Map<string, Promise<unknown>>
  awaitAll(): Promise<void>
}


export function createRequestContext(): NuxeRequestContext {
  const payload: Record<string, unknown> = {}
  const pending = new Map<string, Promise<unknown>>()

  return {
    payload,
    pending,
    async awaitAll() {
      if (pending.size === 0) return
      await Promise.allSettled(pending.values())
    }
  }
}

export function getCurrentContext(): NuxeRequestContext | undefined {
  return storage?.getStore()
}

export async function runWithContext<T>(ctx: NuxeRequestContext, fn: () => Promise<T>): Promise<T> {
  if (!storage) return await fn()
  return storage.run(ctx, fn)
}

