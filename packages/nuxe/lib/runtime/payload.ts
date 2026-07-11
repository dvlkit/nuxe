import { parse } from 'devalue'
import type { NuxeErrorPayload } from './error'

export interface HydrationPayload {
    data: Record<string, unknown | null> | null
    error: NuxeErrorPayload | null
    state: Record<string, unknown>
}

const HYDRATION_SCRIPT_ID = '__NUXE_DATA__'

export function readHydrationPayload(): HydrationPayload | null {
    if (typeof document === 'undefined') return null
    const el = document.getElementById(HYDRATION_SCRIPT_ID)
    const raw = el?.textContent
    if (!raw) return null
    const parsed = parse(raw) as Partial<HydrationPayload> | null
    if (!parsed || typeof parsed !== 'object') return null
    return {
        data: parsed.data ?? null,
        error: parsed.error ?? null,
        state: parsed.state ?? {}
    }
}