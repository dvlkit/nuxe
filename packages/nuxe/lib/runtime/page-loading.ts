import type { NuxeApp } from '../plugins/runtime'

const NAVIGATION_RESOLVED = Symbol.for('@dvlkit/nuxe/navigation-resolved')

type NavigationFlag = NuxeApp & { [NAVIGATION_RESOLVED]?: boolean }

export function markCurrentNavigationResolved(nuxeApp: NuxeApp): void {
  ;(nuxeApp as NavigationFlag)[NAVIGATION_RESOLVED] = true
}

export function resetCurrentNavigationResolved(nuxeApp: NuxeApp): void {
  ;(nuxeApp as NavigationFlag)[NAVIGATION_RESOLVED] = false
}

export function isCurrentNavigationResolved(nuxeApp: NuxeApp): boolean {
  return (nuxeApp as NavigationFlag)[NAVIGATION_RESOLVED] === true
}
