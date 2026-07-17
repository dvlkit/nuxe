import {
    computed,
    getCurrentInstance,
    getCurrentScope,
    isRef,
    nextTick,
    onMounted,
    onScopeDispose,
    onServerPrefetch,
    ref,
    shallowRef,
    toValue,
    watch,
    type Ref,
    type WatchSource,
} from 'vue'
import {tryUseNuxeApp} from './app-context'
import type {NuxeApp} from '../plugins/runtime'
import type {NuxeSSRContext} from '../types/ssr-context'

export type AsyncDataKey = string | Ref<string> | (() => string)

export interface AsyncDataHandlerOptions {
    signal: AbortSignal
}

export type AsyncDataHandler<T> = (
    nuxeApp: NuxeApp,
    options: AsyncDataHandlerOptions,
) => Promise<T>

export interface UseAsyncDataOptions<T> {
    default?: () => T | Ref<T>
    server?: boolean
    lazy?: boolean
    retryCount?: number
    retryDelayMs?: number
    watch?: WatchSource | WatchSource[]
}

export interface UseAsyncDataReturn<T> {
    data: Ref<T | null>
    pending: Ref<boolean>
    error: Ref<Error | null>
    status: Ref<'idle' | 'pending' | 'success' | 'error'>
    refresh: () => Promise<void>
}

type Status = UseAsyncDataReturn<unknown>['status']['value']

let hydratedPayload: Record<string, unknown> | null = null

export function setHydratedPayload(payload: Record<string, unknown | null>): void {
    hydratedPayload = payload
}

export function readHydratedKey<T = unknown>(key: string): T | undefined {
    if (!hydratedPayload || !(key in hydratedPayload)) return undefined
    return hydratedPayload[key] as T
}

export interface AsyncDataEntry<T = unknown> {
    key: string
    data: Ref<T | null>
    pending: Ref<boolean>
    error: Ref<Error | null>
    status: Ref<'idle' | 'pending' | 'success' | 'error'>
    _handlerSource: string
    _defaultSource: string
    _optionsHash: string
    _server: boolean
    _lazy: boolean
    _retries: number
    _retryDelay: number
    _deps: number
    _inflight: Promise<void> | null
}

function getAsyncDataCache(app: NuxeApp | null): Map<string, AsyncDataEntry> {
    if (!app) return new Map()
    if (!app._asyncData) app._asyncData = new Map()
    return app._asyncData as Map<string, AsyncDataEntry>
}

function hashOptions(opts: UseAsyncDataOptions<unknown>): string {
    return JSON.stringify({
        server: opts.server !== false,
        lazy: !!opts.lazy,
        retryCount: Math.max(0, opts.retryCount ?? 0),
        retryDelayMs: Math.max(0, opts.retryDelayMs ?? 0),
    })
}

function warnIfIncompatible(entry: AsyncDataEntry, options: UseAsyncDataOptions<unknown>, handler: AsyncDataHandler<unknown>, key: string): void {
    if (import.meta.env?.DEV || import.meta.env?.MODE !== 'production') {
        const handlerSource = handler.toString()
        const defaultSource = options.default ? options.default.toString() : ''
        const warnings: string[] = []
        if (handlerSource !== entry._handlerSource) warnings.push('different `handler`')
        if (defaultSource !== entry._defaultSource) warnings.push('different `default` value')
        if (hashOptions(options) !== entry._optionsHash) warnings.push('different options (server/lazy/retry*)')
        if (warnings.length) {
            console.warn(`[nuxe] useAsyncData("${key}") was called with ${warnings.join(', ')} than the first consumer. Reusing existing entry — if this is intentional, ignore; otherwise prefer a unique key or align the call sites.`)
        }
    }
}

function getSSRContext(): NuxeSSRContext | undefined {
    if (typeof window !== 'undefined') return undefined
    const nuxeApp = tryUseNuxeApp()
    if (nuxeApp?.ssrContext) return nuxeApp.ssrContext as NuxeSSRContext
    return (globalThis as { __NUXE_SSR_CONTEXT__?: NuxeSSRContext }).__NUXE_SSR_CONTEXT__
}

async function runWithRetries<T>(
    handler: AsyncDataHandler<T>,
    nuxeApp: NuxeApp,
    signal: AbortSignal,
    retries: number,
    delay: number,
): Promise<T> {
    let lastError: unknown
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await handler(nuxeApp, {signal})
        } catch (err) {
            lastError = err
            if (attempt < retries && delay > 0) {
                await new Promise((resolve) => setTimeout(resolve, delay))
            }
        }
    }
    throw lastError
}

export function useAsyncData<T>(key: AsyncDataKey, handler: AsyncDataHandler<T>, options: UseAsyncDataOptions<T> = {}): UseAsyncDataReturn<T> {
    if (!key) throw new Error('[nuxe] useAsyncData: `key` is required')

    const isClient = typeof window !== 'undefined'
    const ssrContext = getSSRContext()
    const ssrDisabled = ssrContext?.routeRules?.ssr === false
    const runOnServer = !isClient && ssrContext !== undefined && options.server !== false && !ssrDisabled

    const keyRef = computed(() => toValue(key))
    const resolvedKey = String(keyRef.value)
    const nuxeApp = tryUseNuxeApp()
    const cache = getAsyncDataCache(nuxeApp)
    const existing = cache.get(resolvedKey) as AsyncDataEntry<T> | undefined

    let entry: AsyncDataEntry<T>

    if (existing) {
        warnIfIncompatible(existing as AsyncDataEntry<unknown>, options, handler as AsyncDataHandler<unknown>, resolvedKey)
        existing._deps += 1
        entry = existing as AsyncDataEntry<T>
    } else {
        entry = {
            key: resolvedKey,
            data: shallowRef<T | null>(null) as Ref<T | null>,
            pending: ref(!!options.lazy),
            error: shallowRef<Error | null>(null),
            status: ref<Status>('idle'),
            _handlerSource: handler.toString(),
            _defaultSource: options.default ? options.default.toString() : '',
            _optionsHash: hashOptions(options),
            _server: options.server !== false,
            _lazy: !!options.lazy,
            _retries: Math.max(0, options.retryCount ?? 0),
            _retryDelay: Math.max(0, options.retryDelayMs ?? 0),
            _deps: 1,
            _inflight: null,
        }
        cache.set(resolvedKey, entry as unknown as AsyncDataEntry)
    }

    const runEntry = async (useKey: string): Promise<void> => {
        if (entry._inflight) {
            await entry._inflight
            return
        }
        const execNuxeApp = !isClient ? tryUseNuxeApp() : null
        const ctx = ssrContext

        const promise = (async () => {
            const abortController = new AbortController()
            const exec = (): Promise<T> => {
                const callHandler = () => runWithRetries<T>(handler, execNuxeApp as NuxeApp, abortController.signal, entry._retries, entry._retryDelay)
                return execNuxeApp && !isClient ? execNuxeApp.vueApp.runWithContext(callHandler) : callHandler()
            }
            entry.error.value = null
            try {
                const result = await exec()
                entry.data.value = result
                entry.status.value = 'success'
                if (ctx) ctx.payload[useKey] = result
            } catch (err) {
                entry.error.value = err instanceof Error ? err : new Error(String(err))
                entry.status.value = 'error'
                if (ctx) ctx.payload[useKey] = {__error: entry.error.value.message}
            } finally {
                entry.pending.value = false
                if (ctx) ctx.pending.delete(useKey)
            }
        })()

        entry._inflight = promise.finally(() => {
            entry._inflight = null
        })
        await entry._inflight
    }

    if (isClient) {
        if (existing) {
            if (entry._deps === 1) {
                onMounted(() => {
                    if (entry.status.value === 'idle') {
                        entry.pending.value = true
                        entry.status.value = 'pending'
                        void runEntry(resolvedKey)
                    }
                })
            }
        } else if (entry._lazy) {
            onMounted(() => {
                const hydrated = readHydratedKey<T>(resolvedKey)
                if (hydrated !== undefined) {
                    if (hydrated !== null && typeof hydrated === 'object' && '__error' in hydrated) {
                        entry.error.value = new Error(String((hydrated as { __error: unknown }).__error))
                        entry.status.value = 'error'
                    } else {
                        entry.data.value = hydrated
                        entry.status.value = 'success'
                    }
                    entry.pending.value = false
                } else {
                    entry.status.value = 'pending'
                    void runEntry(resolvedKey)
                }
            })
        } else {
            const hydrated = readHydratedKey<T>(resolvedKey)
            if (hydrated !== undefined) {
                if (hydrated !== null && typeof hydrated === 'object' && '__error' in hydrated) {
                    entry.error.value = new Error(String((hydrated as { __error: unknown }).__error))
                    entry.status.value = 'error'
                } else {
                    entry.data.value = hydrated
                    entry.status.value = 'success'
                }
            }
        }
    }

    if (entry.data.value === null && options.default && !existing) {
        const d = options.default()
        entry.data.value = (isRef(d) ? d.value : d) as T
    }

    if (entry.status.value === 'idle' && runOnServer && !existing) {
        if (entry._lazy) {
            const handlerPromise = runEntry(resolvedKey)
            if (ssrContext) ssrContext.pending.set(resolvedKey, handlerPromise)
        } else {
            entry.pending.value = true
            entry.status.value = 'pending'
            const handlerPromise = runEntry(resolvedKey)
            if (ssrContext) ssrContext.pending.set(resolvedKey, handlerPromise)
            if (getCurrentInstance()) {
                onServerPrefetch(() => handlerPromise)
            }
        }
    }

    if (entry.status.value === 'idle' && isClient && !entry._lazy && !existing) {
        entry.pending.value = true
        entry.status.value = 'pending'
        if (ssrContext) {
            ssrContext.pending.set(resolvedKey, runEntry(resolvedKey))
        } else {
            void runEntry(resolvedKey)
        }
    }

    if (isClient) {
        let keyChanging = false
        const hasScope = !!getCurrentScope()
        let stopKeyWatch: (() => void) | undefined
        let stopDepsWatch: (() => void) | undefined

        if (isRef(key) || typeof key === 'function') {
            stopKeyWatch = watch(keyRef, async (newKey) => {
                if (newKey === resolvedKey) return
                keyChanging = true
                try {
                    entry.data.value = null
                    entry.error.value = null
                    entry.pending.value = true
                    entry.status.value = 'pending'
                    await runEntry(newKey)
                } finally {
                    await nextTick()
                    keyChanging = false
                }
            }, {flush: 'sync'})
        }

        if (options.watch !== undefined) {
            stopDepsWatch = watch(options.watch, () => {
                if (keyChanging) return
                entry.pending.value = true
                entry.status.value = 'pending'
                if (ssrContext) {
                    ssrContext.pending.set(resolvedKey, runEntry(resolvedKey))
                } else {
                    void runEntry(resolvedKey)
                }
            })
        }

        if (hasScope) {
            onScopeDispose(() => {
                stopKeyWatch?.()
                stopDepsWatch?.()
                const cached = cache.get(resolvedKey) as AsyncDataEntry<T> | undefined
                if (cached && cached === entry) {
                    cached._deps -= 1
                }
            })
        }
    }

    const refresh = async (): Promise<void> => {
        await runEntry(resolvedKey)
    }

    return {data: entry.data, pending: entry.pending, error: entry.error, status: entry.status, refresh}
}