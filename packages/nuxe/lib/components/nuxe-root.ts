import { defineComponent, h, Suspense, type Component, type PropType } from 'vue'


export const NuxeRoot = defineComponent({
  name: 'NuxeRoot',
  inheritAttrs: false,
  props: {
    app: {
      type: [Object, Function] as PropType<Component>,
      required: true,
    },
  },
  setup(props) {
    return () => h(Suspense, null, {
      default: () => h(props.app as Component),
    })
  },
})