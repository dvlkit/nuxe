type AlsCtor = new <T>() => {
  getStore(): T | undefined
  run<R>(store: T, callback: () => R): R
}

if (typeof globalThis !== 'undefined'
  && typeof (globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage === 'undefined') {
  if (typeof require === 'function') {
    try {
      const { AsyncLocalStorage } = require('node:async_hooks') as { AsyncLocalStorage: AlsCtor }
      ;(globalThis as { AsyncLocalStorage?: AlsCtor }).AsyncLocalStorage = AsyncLocalStorage
    } catch {
    }
  }
}

export {}
