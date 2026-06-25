import type { NavigationGuardReturn, RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

export type RouteMiddleware = (to: RouteLocationNormalized, from: RouteLocationNormalized) => NavigationGuardReturn

export function defineNuxeRouteMiddleware(middleware: RouteMiddleware): RouteMiddleware {
  return middleware
}

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
    return target
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

export function abortNavigation(err?: Error | string | AbortNavigationOptions): false {
  (abortNavigation as any).__lastPayload = err instanceof Error ? {statusMessage: err.message}
    : typeof err === 'string' ? {statusMessage: err}
      : err
  return false
}