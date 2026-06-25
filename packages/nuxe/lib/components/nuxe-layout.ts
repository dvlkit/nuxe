import { computed, defineComponent, h, Suspense, Transition, type PropType } from 'vue'
import { useRoute, type NavigationGuard, type RouteMeta } from 'vue-router'
import layouts from '#nuxe/layouts.mjs'

declare module 'vue-router' {
  interface RouteMeta {
    layout?: string | false | null
    layoutProps?: Record<string, unknown>
    middleware?: string | NavigationGuard | (string | NavigationGuard)[]
  }
}

type LayoutName = keyof typeof layouts

export const NuxeLayout = defineComponent({
  name: 'NuxeLayout',
  inheritAttrs: false,
  props: {
    name: {
      type: [String, Boolean] as PropType<LayoutName | false | null>,
      default: null
    },
    fallback: {
      type: String as PropType<LayoutName | null>,
      default: null
    },
    transition: {
      type: [Boolean, Object] as PropType<boolean | Record<string, unknown>>,
      default: false,
    }
  },
  setup(props, {slots, attrs}) {
    const route = useRoute()

    const layoutName = computed<LayoutName | null>(() => {
      if (props.name !== null) {
        return props.name === false ? null : (props.name as LayoutName)
      }

      const meta = route.meta as RouteMeta
      const metaLayout = meta.layout
      if (metaLayout === false) return null
      if (typeof metaLayout === 'string') return metaLayout as LayoutName
      return 'default' as LayoutName
    })

    const resolvedLayout = computed(() => {
      const name = layoutName.value
      if (!name) return null
      if (name in layouts) {
        return (layouts as Record<string, unknown>)[name]
      }

      if (props.fallback && props.fallback in layouts) {
        return (layouts as Record<string, unknown>)[props.fallback]
      }
      if ('default' in layouts) {
        return (layouts as Record<string, unknown>)['default']
      }
      return null
    })

    return () => {
      const LayoutComponent = resolvedLayout.value as any

      if (!LayoutComponent) {
        return slots.default?.() ?? null
      }

      const metaLayout = route.meta as { layoutProps?: Record<string, unknown> }
      const layoutProps = (metaLayout.layoutProps ?? attrs) as Record<string, unknown>

      const layoutVNode = h(LayoutComponent, layoutProps, {default: slots.default})

      if (props.transition) {
        const transitionProps = typeof props.transition === 'object' ? props.transition : {name: 'fade'}
        return h(Transition, transitionProps as any, {
          default: () => layoutVNode
        })
      }

      return layoutVNode
    }
  }
})