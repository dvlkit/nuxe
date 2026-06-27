import { defineComponent, h, Suspense, type Component, type PropType } from 'vue'
import { useHead } from '@unhead/vue'
import { useError } from '../runtime'

export const NuxeRoot = defineComponent({
  name: 'NuxeRoot',
  inheritAttrs: false,
  props: {
    app: {
      type: [Object, Function] as PropType<Component>,
      required: true,
    },
    errorComponent: {
      type: [Object, Function] as PropType<Component>,
      required: true,
    },
  },
  setup(props) {
    useHead({
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      ],
    })

    const error = useError()

    return () => {
      if (error.value) {
        return h(props.errorComponent as Component, { error: error.value })
      }

      return h(Suspense, null, {
        default: () => h(props.app as Component),
      })
    }
  },
})