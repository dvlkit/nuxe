---
"@dvlkit/nuxe": major
---

feat(framework): `<NuxeLayout>` se genera por-consumer y se auto-registra globalmente; se elimina el subpath `@dvlkit/nuxe/components/nuxe-layout`

**Breaking**: el subpath `@dvlkit/nuxe/components/nuxe-layout` ya no existe. Quien lo importaba debe sacar el `import { NuxeLayout } from '@dvlkit/nuxe/components/nuxe-layout'` y usar `<NuxeLayout>` directamente — el componente se auto-registra a través de `unplugin-vue-components` desde `.nuxe/components/NuxeLayout.vue`, que el Vite plugin del framework genera al startup con los layouts del consumer inlineados.

**Bug fix incluido**: el `.js` publicado del componente llevaba un `import layouts from "#nuxe/layouts.mjs"` que Node ESM no podía resolver (el specifier no estaba declarado en `package.json` `exports`). Eso rompía cualquier consumer que importara el subpath en build SSR / Nitro. Ahora el componente generado no tiene virtual imports: importa cada layout por path relativo, así que Vite, Nitro/Rollup y Node lo resuelven sin intervención del plugin.

**Otros cambios**:
- Se elimina `lib/components/nuxe-layout.ts`, `lib/prepare-layouts.ts` y el handler de `virtual:nuxe/layouts` en `lib/plugin.ts` (eran código muerto o responsables del bug).
- `lib/prepare-nuxe-layout-component.ts` reemplaza a `prepare-layouts.ts` y escribe `.nuxe/components/NuxeLayout.vue` en lugar de `.nuxe/layouts.mjs`.
- API pública del componente preservada: `name`, `fallback`, `transition`, default slot, `inheritAttrs: false`. `meta.layout` sigue funcionando como antes.

**Migración**: borrar `import { NuxeLayout } from '@dvlkit/nuxe/components/nuxe-layout'` de `app.vue`. `<NuxeLayout>` queda registrado vía `.nuxe/components.d.ts`.