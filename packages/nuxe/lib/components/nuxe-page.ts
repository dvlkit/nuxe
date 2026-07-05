import { defineComponent, h, Suspense } from 'vue'
import { RouterView } from 'vue-router'
import { useNuxeApp } from '../plugins/runtime'

export default defineComponent({
  name: 'NuxePage',
  setup() {
    const nuxeApp = useNuxeApp()

    return () => h(Suspense, {
      onResolve: () => {
        void nuxeApp.callHook('page:loading:end')
      }
    }, {
      default: () => h(RouterView)
    })
  }
})