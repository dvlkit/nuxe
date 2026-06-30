import {
  cloneVNode,
  createCommentVNode,
  defineComponent,
  h,
  onMounted,
  shallowRef,
  type SlotsType,
  type VNode,
} from 'vue'

interface ClientOnlyProps {
  fallback?: string
  placeholder?: string
  placeholderTag?: string
  fallbackTag?: string
}

type ClientOnlySlots = SlotsType<{
  default?: () => VNode[]
  fallback?: () => VNode[]
  placeholder?: () => VNode[]
}>

export default defineComponent({
  name: 'ClientOnly',
  inheritAttrs: false,
  props: {
    fallback: String,
    placeholder: String,
    placeholderTag: String,
    fallbackTag: String,
  },
  ...(import.meta.dev && {
    slots: Object as ClientOnlySlots,
  }),
  setup(props, { slots, attrs }) {
    const mounted = shallowRef(false)
    onMounted(() => {
      mounted.value = true
    })

    return () => {
      if (mounted.value) {
        const vnodes = slots.default?.()
        if (vnodes && vnodes.length === 1) {
          return [cloneVNode(vnodes[0]!, attrs)]
        }
        return vnodes
      }

      const slot = slots.fallback || slots.placeholder
      if (slot) {
        return h(slot)
      }

      const fallbackStr = props.fallback || props.placeholder
      const fallbackTag = props.fallbackTag || props.placeholderTag
      if (fallbackStr !== undefined && fallbackTag !== undefined) {
        return h(fallbackTag, attrs, fallbackStr)
      }
      if (fallbackStr !== undefined) {
        return h('span', attrs, fallbackStr)
      }
      return [createCommentVNode('placeholder')]
    }
  },
})
