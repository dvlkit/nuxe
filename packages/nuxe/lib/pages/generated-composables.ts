export function generateNavigateTo(): string {
  return `import { navigateTo as _navigateTo, type NavigateToOptions } from '@dvlkit/nuxe'
import type { NuxeRouteLocationRaw } from '../typed-router'

export function navigateTo(to: NuxeRouteLocationRaw, options?: NavigateToOptions) {
  return _navigateTo(to as any, options)
}
`
}

export function generateUseRoute(): string {
  return `import { useRoute as _useRoute } from 'vue-router'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { RouteNamedMap } from '../typed-router'

export type NuxeRoute<Name extends keyof RouteNamedMap> = RouteLocationNormalizedLoaded & {
  name: Name
  params: RouteNamedMap[Name] extends { params: infer P } ? P : never
}

export function useNuxeRoute<Name extends keyof RouteNamedMap = keyof RouteNamedMap>(
  name?: Name,
): NuxeRoute<Name> {
  return _useRoute(name as never) as NuxeRoute<Name>
}
`
}
