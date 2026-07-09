import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export function buildNuxeLayoutComponent(layouts: string[]): string {
  const imports = layouts
    .map((f, i) => `import __layout_${i} from '../../app/layouts/${f}'`)
    .join('\n')

  const mapEntries = layouts.length === 0
    ? ''
    : layouts
        .map((f, i) => `  '${f.replace(/\.vue$/, '').toLowerCase()}': __layout_${i}`)
        .join(',\n') + ','

  return `<script lang="ts">
export default {
  inheritAttrs: false,
  name: 'NuxeLayout',
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { useRoute } from 'vue-router'

${imports}

const layouts: Record<string, unknown> = {
${mapEntries}
}

const props = withDefaults(defineProps<{
  name?: string | false | null
  fallback?: string | null
  transition?: boolean | Record<string, unknown>
}>(), {
  name: null,
  fallback: null,
  transition: false,
})

const attrs = useAttrs()
const route = useRoute()

const layoutName = computed<string | null>(() => {
  if (props.name !== null) {
    return props.name === false ? null : (props.name as string)
  }
  const metaLayout = (route.meta as { layout?: string | false | null }).layout
  if (metaLayout === false) return null
  if (typeof metaLayout === 'string') return metaLayout
  return 'default'
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

const layoutProps = computed<Record<string, unknown>>(() => {
  const meta = route.meta as { layoutProps?: Record<string, unknown> }
  return (meta.layoutProps ?? attrs) as Record<string, unknown>
})
</script>

<template>
  <slot v-if="!resolvedLayout" />
  <Transition
    v-else-if="transition"
    v-bind="typeof transition === 'object' ? transition : { name: 'fade' }"
  >
    <component :is="resolvedLayout" v-bind="layoutProps">
      <slot />
    </component>
  </Transition>
  <component v-else :is="resolvedLayout" v-bind="layoutProps">
    <slot />
  </component>
</template>
`
}

export function prepareNuxeLayoutComponent(cwd: string): void {
  const layoutsDir = resolve(cwd, 'app/layouts')
  const layoutFiles = existsSync(layoutsDir)
    ? readdirSync(layoutsDir).filter(f => f.endsWith('.vue'))
    : []

  const componentsDir = resolve(cwd, '.nuxe', 'components')
  if (!existsSync(componentsDir)) mkdirSync(componentsDir, { recursive: true })

  writeFileSync(join(componentsDir, 'NuxeLayout.vue'), buildNuxeLayoutComponent(layoutFiles))
}