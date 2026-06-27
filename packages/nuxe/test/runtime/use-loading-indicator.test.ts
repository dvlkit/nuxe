import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useLoadingIndicator } from '../../lib/runtime/use-loading-indicator'

describe('useLoadingIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts hidden', () => {
    const { isLoading, progress } = useLoadingIndicator()
    expect(isLoading.value).toBe(false)
    expect(progress.value).toBe(0)
  })

  it('shows after throttle and advances progress', () => {
    const { isLoading, progress, start } = useLoadingIndicator({ throttle: 200 })
    start()
    expect(isLoading.value).toBe(false)
    vi.advanceTimersByTime(200)
    expect(isLoading.value).toBe(true)
    vi.advanceTimersByTime(100)
    expect(progress.value).toBe(66)
  })

  it('finishes to 100 then hides', () => {
    const { isLoading, progress, start, finish } = useLoadingIndicator({ throttle: 0, duration: 400 })
    start()
    vi.advanceTimersByTime(0)
    expect(isLoading.value).toBe(true)
    finish()
    expect(progress.value).toBe(100)
    vi.advanceTimersByTime(101)
    expect(isLoading.value).toBe(false)
    expect(progress.value).toBe(0)
  })

  it('set clamps progress between 0 and 100', () => {
    const { progress, set } = useLoadingIndicator()
    set(150)
    expect(progress.value).toBe(100)
    set(-10)
    expect(progress.value).toBe(0)
    set(42)
    expect(progress.value).toBe(42)
  })
})
