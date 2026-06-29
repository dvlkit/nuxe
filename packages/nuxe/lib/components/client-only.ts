import { defineComponent, h, onMounted, shallowRef, type SlotsType } from 'vue'

interface ClientOnlyProps {
  fallback?: string
  placeholder?: string
  placeholderTag?: string
  fallbackTag?: string
}

type ClientOnlySlots = SlotsType<{
  default?: () => any[]
  fallback?: () => any[]
  placeholder?: () => any[]
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
    onMounted(() => { mounted.value = true })

    return () => {
      if (mounted.value) {
        return slots.default?.()
      }

      const slot = slots.fallback || slots.placeholder
      if (slot) {
        return h(slot)
      }

      const fallbackStr = props.fallback || props.placeholder || ''
      const fallbackTag = props.fallbackTag || props.placeholderTag || 'span'
      return h(fallbackTag, attrs, fallbackStr)
    }
  },
})
