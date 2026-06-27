import { defineComponent, h } from 'vue'
import { useNuxtApp } from '../plugins/runtime'
import { useLoadingIndicator } from '../runtime/use-loading-indicator'

export default defineComponent({
  name: 'NuxtLoadingIndicator',
  props: {
    color: {
      type: String,
      default: '#80c864',
    },
    height: {
      type: Number,
      default: 2,
    },
    duration: {
      type: Number,
      default: 2000,
    },
    throttle: {
      type: Number,
      default: 200,
    },
  },
  setup(props) {
    const nuxtApp = useNuxtApp()
    const { progress, isLoading, start, finish } = useLoadingIndicator({
      duration: props.duration,
      throttle: props.throttle,
    })

    nuxtApp.hook('page:start', start)
    nuxtApp.hook('page:finish', finish)

    return () => {
      if (!isLoading.value) return null
      return h('div', {
        style: {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: `${props.height}px`,
          width: `${progress.value}%`,
          background: props.color,
          transition: 'width 200ms linear, opacity 200ms linear',
          zIndex: 9999,
          pointerEvents: 'none',
        },
      })
    }
  },
})
