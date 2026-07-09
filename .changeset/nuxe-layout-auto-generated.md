---
"@dvlkit/nuxe": minor
---

feat(framework): `<NuxeLayout>` se genera por-consumer y se auto-registra globalmente; se elimina el subpath `@dvlkit/nuxe/components/nuxe-layout`

**Breaking** (subpath removal): el subpath `@dvlkit/nuxe/components/nuxe-layout` ya no existe. Quien lo importaba debe sacar el `import { NuxeLayout } from '@dvlkit/nuxe/components/nuxe-layout'` y usar `<NuxeLayout>` directamente. El componente se auto-registra vía `unplugin-vue-components` desde `.nuxe/components/NuxeLayout.vue`, que el Vite plugin del framework genera al startup con los layouts del consumer inlineados por path relativo.

**Bug fix** (capa encima del refactor): el componente generado declaraba `defineProps<{ name?: string | false | null }>()` sin `default` explícito. Como `false` está en la type union, Vue 3 hace Boolean cast y `props.name` quedaba como `false` cuando no se pasaba. El computed `layoutName` se comía el `false` y retornaba `null`, así que `resolvedLayout` quedaba en null y el render caía al branch "slot puro" — el layout no se mostraba, sin errores en consola. Fix: usar `withDefaults(defineProps<...>(), { name: null, fallback: null, transition: false })` para preservar la semántica del componente original.

**Otros cambios del refactor**:

- Se elimina `lib/components/nuxe-layout.ts`, `lib/prepare-layouts.ts` y el handler de `virtual:nuxe/layouts` en `lib/plugin.ts` (código muerto post-fix o responsable del import virtual roto que rompía SSR en Node ESM).
- `lib/prepare-nuxe-layout-component.ts` reemplaza a `prepare-layouts.ts` y escribe `.nuxe/components/NuxeLayout.vue` en lugar de `.nuxe/layouts.mjs`.
- API pública del componente preservada: `name`, `fallback`, `transition`, default slot, `inheritAttrs: false`. `meta.layout` sigue funcionando como antes.

**Migración**: borrar `import { NuxeLayout } from '@dvlkit/nuxe/components/nuxe-layout'` de `app.vue`. `<NuxeLayout>` queda registrado vía `.nuxe/components.d.ts`.

**Nota de versionado**: este release iba a publicarse como `1.0.0` pero se revirtió a `0.9.0`. El framework todavía no está en condición de declarar `1.x` estable.
