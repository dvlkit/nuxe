import { defineComponent, h, Suspense } from 'vue'
import { type RouteLocationNormalizedLoaded, RouterView } from 'vue-router'
import { useNuxeApp } from '../plugins/runtime'

export default defineComponent({
  name: 'NuxePage',
  inheritAttrs: false,
  setup(_, { attrs }) {
    const nuxeApp = useNuxeApp()

    return () => h(RouterView, attrs, {
      default: (routeProps: { Component: any; route: RouteLocationNormalizedLoaded }) => {
        return h(Suspense, {
          suspensible: true,
          onPending: () => {
            void nuxeApp.callHook('page:loading:start')
          },
          onResolve: () => {
            void nuxeApp.callHook('page:loading:end')
          }
        }, {
          default: () => h(routeProps.Component)
        })
      }
    })
  }
})