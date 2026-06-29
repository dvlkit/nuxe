import {
  hasInjectionContext,
  inject,
  type App,
  type InjectionKey,
} from 'vue'

const BASE_URL_KEY: InjectionKey<string | undefined> = Symbol(
  '@dvlkit/nuxe/base-url',
)

let cachedBaseURL: string | undefined

export function provideBaseURL(
  app: App,
  baseURL: string | undefined,
): void {
  cachedBaseURL = baseURL
  app.provide(BASE_URL_KEY, baseURL)
}

export function useBaseURL(): string | undefined {
  if (hasInjectionContext()) {
    const injected = inject(BASE_URL_KEY, undefined)
    if (injected !== undefined) return injected
  }
  return cachedBaseURL
}

export function resetBaseURLCache(): void {
  cachedBaseURL = undefined
}
