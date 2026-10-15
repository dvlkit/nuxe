import { defineComponent, h, onUnmounted, Suspense } from 'vue'
import { type RouteLocationNormalizedLoaded, RouterView } from 'vue-router'
import { useNuxeApp } from '../plugins/runtime'
import { markCurrentNavigationResolved, resetCurrentNavigationResolved } from '../runtime/page-loading'

export default defineComponent({
  name: 'NuxePage',
  inheritAttrs: false,
  setup(_, { attrs }) {
    const nuxeApp = useNuxeApp()
    let navigationId = 0

    const onPageStart = () => {
      navigationId += 1
      resetCurrentNavigationResolved(nuxeApp)
    }
    nuxeApp.hook('page:start', onPageStart)
    onUnmounted(() => {
      nuxeApp.removeHook('page:start', onPageStart)
    })

    return () => h(RouterView, attrs, {
      default: (routeProps: { Component: any; route: RouteLocationNormalizedLoaded }) => {
        const id = navigationId
        return h(Suspense, {
          suspensible: true,
          onPending: () => {
            void nuxeApp.callHook('page:loading:start')
          },
          onResolve: () => {
            if (id !== navigationId) return
            markCurrentNavigationResolved(nuxeApp)
            void nuxeApp.callHook('page:loading:end')
          }
        }, {
          default: () => h(routeProps.Component)
        })
      }
    })
  }
})