import { ref, type Ref } from 'vue'

export interface UseLoadingIndicatorOptions {
  throttle?: number
  duration?: number
}

export interface LoadingIndicator {
  progress: Ref<number>
  isLoading: Ref<boolean>
  start: () => void
  finish: () => void
  set: (value: number) => void
}

export function useLoadingIndicator(options: UseLoadingIndicatorOptions = {}): LoadingIndicator {
  const throttle = options.throttle ?? 200
  const duration = options.duration ?? 2000

  const progress = ref(0)
  const isLoading = ref(false)
  let throttleTimer: ReturnType<typeof setTimeout> | null = null
  let progressTimer: ReturnType<typeof setTimeout> | null = null
  let hideTimer: ReturnType<typeof setTimeout> | null = null

  const clearTimers = () => {
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
    if (progressTimer) {
      clearTimeout(progressTimer)
      progressTimer = null
    }
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  const start = () => {
    clearTimers()
    progress.value = 0
    throttleTimer = setTimeout(() => {
      isLoading.value = true
      progressTimer = setTimeout(() => {
        progress.value = 66
      }, 100)
    }, throttle)
  }

  const finish = () => {
    clearTimers()
    progress.value = 100
    hideTimer = setTimeout(() => {
      isLoading.value = false
      progress.value = 0
    }, duration / 4)
  }

  const set = (value: number) => {
    progress.value = Math.max(0, Math.min(100, value))
  }

  return {
    progress,
    isLoading,
    start,
    finish,
    set,
  }
}
