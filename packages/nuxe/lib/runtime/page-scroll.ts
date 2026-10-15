import {
  START_LOCATION,
  type RouteLocationNormalized,
  type RouteLocationNormalizedLoaded,
  type RouterScrollBehavior,
} from 'vue-router'
import type { NuxeApp } from '../plugins/runtime'
import { isCurrentNavigationResolved } from './page-loading'

type HashScrollBehavior = 'auto' | 'smooth' | 'instant'

function getHashElementScrollMarginTop(selector: string): number {
  try {
    const elem = document.querySelector(selector)
    if (!elem) return 0
    return (Number.parseFloat(getComputedStyle(elem).scrollMarginTop) || 0)
      + (Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0)
  } catch {
    return 0
  }
}

export function createPageScrollBehavior(
  getNuxeApp: () => NuxeApp,
  hashScrollBehavior: HashScrollBehavior,
): RouterScrollBehavior {
  return (to, from, savedPosition) => {
    const stripTrailingSlash = (path: string) => (path.endsWith('/') ? path.slice(0, -1) : path)
    const samePath = stripTrailingSlash(to.path) === stripTrailingSlash(from.path)
    if (samePath) {
      if (from.hash && !to.hash) return { left: 0, top: 0 }
      if (to.hash) {
        return {
          el: to.hash,
          top: getHashElementScrollMarginTop(to.hash),
          behavior: hashScrollBehavior,
        }
      }
      return false
    }

    const metaScrollToTop = (to.meta as {
      scrollToTop?: boolean | ((to: RouteLocationNormalized, from: RouteLocationNormalizedLoaded) => unknown)
    }).scrollToTop
    const routeAllowsScrollToTop = typeof metaScrollToTop === 'function'
      ? metaScrollToTop(to, from)
      : metaScrollToTop
    if (routeAllowsScrollToTop === false) return false

    const resolvePosition = () => {
      if (savedPosition) return savedPosition

      if (to.hash) {
        return {
          el: to.hash,
          top: getHashElementScrollMarginTop(to.hash),
          behavior: hashScrollBehavior,
        }
      }

      return { top: 0 }
    }

    if (from === START_LOCATION) return resolvePosition()

    return new Promise((resolve) => {
      const doScroll = () => {
        requestAnimationFrame(() => resolve(resolvePosition()))
      }
      const nuxeApp = getNuxeApp()
      if (isCurrentNavigationResolved(nuxeApp)) {
        doScroll()
        return
      }
      nuxeApp.hookOnce('page:loading:end', doScroll)
    })
  }
}
