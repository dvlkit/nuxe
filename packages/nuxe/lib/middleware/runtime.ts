import type { NavigationGuard, NavigationGuardReturn, RouteLocationRaw } from 'vue-router'

export type RouteMiddleware = NavigationGuard

export function defineNuxeRouteMiddleware(middleware: RouteMiddleware): RouteMiddleware {
  return middleware
}

const NAVIGATE_TO_MARKER = Symbol.for('@dvlkit/nuxe/navigate-to')
const ABORT_NAVIGATION_MARKER = Symbol.for('@dvlkit/nuxe/abort-navigation')

export interface NavigateToOptions {
  replace?: boolean
  redirectCode?: number
  external?: boolean
}

export function navigateTo(
  to: RouteLocationRaw | string | undefined | null,
  options: NavigateToOptions = {}
): NavigationGuardReturn {
  if (to == null) return undefined
  const target: RouteLocationRaw = typeof to === 'string' ? {path: to} : to

  if (options.external) {
    const href = 'path' in target ? target.path : (target as any)
    if (typeof window !== 'undefined') {
      window.location.href = href
      return false
    }
    return {
      [NAVIGATE_TO_MARKER]: true,
      to: href,
      redirectCode: options.redirectCode || 302,
      external: true,
    } as NavigationGuardReturn
  }

  if (typeof window === 'undefined') {
    return {
      [NAVIGATE_TO_MARKER]: true,
      to: target,
      redirectCode: options.redirectCode || 302,
      external: false,
    } as NavigationGuardReturn
  }

  if (options.replace) {
    return {...target, replace: true} as RouteLocationRaw
  }
  return target
}

export interface AbortNavigationOptions {
  statusCode?: number
  statusMessage?: string
}

export interface AbortNavigationResult extends AbortNavigationOptions {
  [ABORT_NAVIGATION_MARKER]: true
}

export function abortNavigation(err?: Error | string | AbortNavigationOptions): false | AbortNavigationResult {
  const payload = err instanceof Error
    ? {statusMessage: err.message}
    : typeof err === 'string'
      ? {statusMessage: err}
      : err || {}

  if (typeof window === 'undefined') {
    return {
      [ABORT_NAVIGATION_MARKER]: true,
      ...payload,
    }
  }

  (abortNavigation as any).__lastPayload = payload
  return false
}