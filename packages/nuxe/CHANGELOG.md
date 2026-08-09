# nuxe

## 0.9.11

### Patch Changes

- 73c6e55: enable `collapseSamePrefixes` in components auto-import configuration

## 0.9.10

### Patch Changes

- af0a474: update imports and auto-imports
- 0eff607: update dependencies

## 0.9.9

### Patch Changes

- fbab89c: feat: add shared directory with utils and types, update auto-imports and aliases

## 0.9.8

### Patch Changes

- 5f646db: fix: runtime config

## 0.9.7

### Patch Changes

- 60fcbf2: fix: missing inport devalue

## 0.9.6

### Patch Changes

- b01c790: fix: runtime config

## 0.9.5

### Patch Changes

- 07760a3: feat(nuxe): runtime config reaches the client at request time

## 0.9.4

### Patch Changes

- 60a579e: feat(nuxe): deduplicate useAsyncData entries per key

## 0.9.3

### Patch Changes

- 302aa22: fix tests

## 0.9.2

### Patch Changes

- a03001c: `NuxeConfigSchema` rechaza `runtimeConfig` con valores `undefined` (típicos de `process.env.X` no definidas en build time), aunque `resolveRuntimeConfig` sí los tolera. Se alinea el schema con el resolver agregando `v.undefined()` al union interno de `runtimeConfigValueSchema`.

## 0.9.1

### Patch Changes

- 7f881ee: update **NUXE**

## 0.9.0

### Minor Changes

- 2c52a00: feat(framework): `<NuxeLayout>` se genera por-consumer y se auto-registra globalmente; se elimina el subpath `@dvlkit/nuxe/components/nuxe-layout`

  **Breaking** (subpath removal): el subpath `@dvlkit/nuxe/components/nuxe-layout` ya no existe. Quien lo importaba debe sacar el `import { NuxeLayout } from '@dvlkit/nuxe/components/nuxe-layout'` y usar `<NuxeLayout>` directamente. El componente se auto-registra vía `unplugin-vue-components` desde `.nuxe/components/NuxeLayout.vue`, que el Vite plugin del framework genera al startup con los layouts del consumer inlineados por path relativo.

  **Bug fix** (capa encima del refactor): el componente generado declaraba `defineProps<{ name?: string | false | null }>()` sin `default` explícito. Como `false` está en la type union, Vue 3 hace Boolean cast y `props.name` quedaba como `false` cuando no se pasaba. El computed `layoutName` se comía el `false` y retornaba `null`, así que `resolvedLayout` quedaba en null y el render caía al branch "slot puro" — el layout no se mostraba, sin errores en consola. Fix: usar `withDefaults(defineProps<...>(), { name: null, fallback: null, transition: false })` para preservar la semántica del componente original.

  **Otros cambios del refactor**:

  - Se elimina `lib/components/nuxe-layout.ts`, `lib/prepare-layouts.ts` y el handler de `virtual:nuxe/layouts` en `lib/plugin.ts` (código muerto post-fix o responsable del import virtual roto que rompía SSR en Node ESM).
  - `lib/prepare-nuxe-layout-component.ts` reemplaza a `prepare-layouts.ts` y escribe `.nuxe/components/NuxeLayout.vue` en lugar de `.nuxe/layouts.mjs`.
  - API pública del componente preservada: `name`, `fallback`, `transition`, default slot, `inheritAttrs: false`. `meta.layout` sigue funcionando como antes.

  **Migración**: borrar `import { NuxeLayout } from '@dvlkit/nuxe/components/nuxe-layout'` de `app.vue`. `<NuxeLayout>` queda registrado vía `.nuxe/components.d.ts`.

  **Nota de versionado**: este release iba a publicarse como `1.0.0` pero se revirtió a `0.9.0`. El framework todavía no está en condición de declarar `1.x` estable.

## 0.8.7

### Patch Changes

- 59ef61b: update fetch

## 0.8.6

### Patch Changes

- f054895: -

## 0.8.5

### Patch Changes

- c184358: chore: update pnpm version to 11 in changesets workflow config

## 0.8.4

### Patch Changes

- ce839e6: add sigstore dependency to changeset publish step in CI config

## 0.8.3

### Patch Changes

- 62f4b12: remove --provenance arg

## 0.8.2

### Patch Changes

- 67077f7: extend NuxeError to inherit from HTTPError

## 0.8.1

### Patch Changes

- 6404f2e: fix: windows paths

## 0.8.0

### Minor Changes

- 72477c9: feat!: refactor async context

## 0.7.55

### Patch Changes

- 62996b2: implement serverFetch in internal fetch logic and add tests for header logging

## 0.7.54

### Patch Changes

- ba9a407: correct execution logic in useAsyncData for Nuxe app integration

## 0.7.53

### Patch Changes

- 8981f39: update Nuxe plugin and async data handling for improved SSR support

## 0.7.52

### Patch Changes

- 5e12b63: enhance useAsyncData to support SSR context and request handling

## 0.7.51

### Patch Changes

- c1aabdf: add loadRuntimeConfig function to server module declaration

## 0.7.50

### Patch Changes

- 672022c: add missing export for redirect function in server index

## 0.7.49

### Patch Changes

- 6158231: add page loading hooks and NuxePage component for enhanced navigation events and layout management

## 0.7.48

### Patch Changes

- fa9cc87: enhance router scroll behavior with configurable hash scrolling and extend runtime config for public router settings

## 0.7.47

### Patch Changes

- 5a1227f: move key watching logic inside client check in useAsyncData

## 0.7.46

### Patch Changes

- a403d4f: add scrollBehavior to router for saved position, hash scrolling, and default fallback

## 0.7.45

### Patch Changes

- 244a84b: add support for internal fetch installation in server build configuration

## 0.7.44

### Patch Changes

- dbe8e86: patch global fetch for internal SSR routing and add request event context utilities

## 0.7.43

### Patch Changes

- 6284c94: add apiPrefix to server configuration

## 0.7.42

### Patch Changes

- 5496d88: add apiPrefix configuration

## 0.7.41

### Patch Changes

- 1627163: solve redirectTo

## 0.7.40

### Patch Changes

- c3cf82d: add runWithNuxeApp function for middleware context and update related tests

## 0.7.39

### Patch Changes

- dcf6493: widen `RouteMiddleware` type to accept async functions, fixing TS2345 on async middlewares. The runtime already handles promises (via `await mw(to, from)`); the type signature is now aligned with the runtime behavior.

## 0.7.38

### Patch Changes

- bee139e: update port resolution logic in loadNuxeConfig

## 0.7.37

### Patch Changes

- 4a976f6: update useRequestURL to handle URL instances

## 0.7.36

### Patch Changes

- f62a9e5: update useRequestFetch to prevent baseURL duplication for absolute URLs

## 0.7.35

### Patch Changes

- 54fe0b2: enhance useRequestFetch to accept event parameter for headers and URL

## 0.7.34

### Patch Changes

- 965b975: useRequestFetch

## 0.7.33

### Patch Changes

- 1b8afbf: add useRequestURL

## 0.7.32

### Patch Changes

- bbe18a7: remove default export from plugin in index.ts

## 0.7.31

### Patch Changes

- 9478ada: enhance routing and page context management with HMR support and new APIs

## 0.7.30

### Patch Changes

- afbc008: refactor config structure and update imports for defineConfig

## 0.7.29

### Patch Changes

- 81bf95c: integrate AutoImport plugin and refactor nitro plugin setup in Nuxe project

## 0.7.28

### Patch Changes

- 35fed4e: integrate nitro plugin into Nuxe project setup and refine Vue plugin handler

## 0.7.27

### Patch Changes

- 8a3b001: remove AutoImport plugin from Nuxe project setup

## 0.7.26

### Patch Changes

- 57e35b8: add additional framework plugins to Nuxe project setup

## 0.7.25

### Patch Changes

- ae18ad6: refactor streamable head handling and add server-head module

## 0.7.24

### Patch Changes

- 5bdaa9f: add runtime environment setup with dotenv support and integrate into config loading

## 0.7.23

### Patch Changes

- 2e7281a: enhance runtime configuration handling with environment variable support

## 0.7.22

### Patch Changes

- 35b07e3: improve error logging by using specific status codes in Nuxe app

## 0.7.21

### Patch Changes

- 3ec273d: add server polyfill and update plugin definitions in Nuxe app
- 7fc8238: add AsyncLocalStorage polyfill and update context handling in Nuxe app

## 0.7.20

### Patch Changes

- dff3ba3: add AsyncLocalStorage support to Nuxe app and request contexts

## 0.7.19

### Patch Changes

- 53c1bbc: enhance Nuxe app state management with clearNuxeState function and improved context handling

## 0.7.18

### Patch Changes

- 49c0708: streamline Nuxe app initialization and context provision

## 0.7.17

### Patch Changes

- 44e78d0: enhance Nuxe app functionality with new context providers and improved request handling

## 0.7.16

### Patch Changes

- a2d7ce4: update useState

## 0.7.15

### Patch Changes

- 2f0b6a6: remove redundant baseURL provision in main function

## 0.7.14

### Patch Changes

- 0226ed4: add baseUrl support and enhance $fetch functionality

## 0.7.13

### Patch Changes

- a9d4ea0: enhance runtime configuration handling and add comprehensive tests

## 0.7.12

### Patch Changes

- 606ac53: correct runtime-config.json serialization to use runtimeConfig

## 0.7.11

### Patch Changes

- 99cd7da: refactor runtime configuration handling and add tests for loadRuntimeConfig

## 0.7.10

### Patch Changes

- 4ed4cee: update loadRuntimeConfig

## 0.7.9

### Patch Changes

- 8cec5af: add nitro logger

## 0.7.8

### Patch Changes

- ac3338e: re-export h3event

## 0.7.7

### Patch Changes

- d6f4787: auto import client only

## 0.7.6

### Patch Changes

- d26cff9: client only

## 0.7.5

### Patch Changes

- e24a90e: createHead

## 0.7.4

### Patch Changes

- 3e89837: createStreamableHead

## 0.7.3

### Patch Changes

- ae7dc37: update workflow

## 0.7.2

### Patch Changes

- 49bb641: update template

## 0.7.1

### Patch Changes

- 28e5c62: update changeset

## 0.7.0

### Minor Changes

- dc0b4da: create nuxe
- cd3b40e: consola and create nuxe
- d70df26: update changeset

## 0.6.3

### Patch Changes

- cb8da87: add git repo

## 0.6.2

### Patch Changes

- 485a0eb: fix publish workflow

## 0.6.1

### Patch Changes

- 8a10604: fix workflow

## 0.6.0

### Minor Changes

- af51cd8: # SSR

  - renderToWebStream con streaming, chunks de head mid-stream (@unhead/vue/stream)
  - Fallback SPA por ruta (vía routeRules)
  - Render de error recovery: si falla, recrea la app y renderiza error.vue
  - Payload de datos, estado y errores serializado e inyectado como window.**NUXE**

  # Data fetching

  - useAsyncData con SSR hydration, default(), server: false, refresh(), lazy mode
  - useFetch wrapper basado en ofetch, con statusCode, hooks onResponse/onError, reactividad
  - Retry policy: retryCount/retryDelayMs con reintentos con delay

  # State & cookies

  - useState con SSR hydration (key-based payload)
  - useCookie con parse/serialize, SSR hydration

  # Request

  - useRequestEvent — acceso al Request nativo del servidor
  - useRequestHeaders — headers planos (server-only)

  # Routing

  - File-based scanner (app/pages/)
  - Typed router generado automáticamente
  - definePageMeta por ruta, route rules (redirect, ssr, prerender)
  - navigateTo (con redirectCode, replace, external)
  - abortNavigation con status codes
  - Route middleware con defineNuxeRouteMiddleware

  # Layouts

  - Auto-scan de app/layouts/, named layouts, multi-word layout files
    Plugins
  - Plugin scanner (app/plugins/) con runtime plugin system
  - Lifecycle hooks: app:created, app:mounted, page:start, page:finish
  - defineNuxtPlugin / useNuxtApp
    Configuration
  - Runtime config con separación public/server, env overrides, tipos generados

  # Error handling

  - createError, showError, useError, clearError
  - error.vue global con error boundary en NuxeRoot
  - Serialización/deserialización de errores para SSR

  # UI

  - <NuxtLoadingIndicator> con useLoadingIndicator, hooks page:start/page:finish
  - <NuxtLayout> con soporte de named layouts y transiciones
  - <NuxtPage> wrapper de <RouterView>

  # Build & CLI

  - nuxe dev, nuxe build, nuxe start
  - ViteNode SSR en dev con hot-reload
  - Nitro como servidor de producción
  - Client manifest + CSS injection
  - Tailwind CSS v4 integrado en playground

## 0.5.2

### Patch Changes

- 46f60c0: useAsyncData

## 0.5.1

### Patch Changes

- 101b1c5: middleware server only

## 0.5.0

### Minor Changes

- e026fff: Add route middleware system. Create files in `app/middleware/` with `.global.ts` for global middleware (runs on every navigation) or `.ts` for named middleware (referenced via `definePage({ meta: { middleware: 'name' } })` inyour page). Auto-imported helpers: `defineNuxeRouteMiddleware`, `navigateTo`, `abortNavigation`.

## 0.4.0

### Minor Changes

- 2efb36b: feat: add useHead composable + SSR-aware head management

## 0.2.0

### Minor Changes

- Add `useHead` composable for per-page `<title>` and `<meta>` tags. Works in SSR (tags emitted in initial HTML) and client (auto-cleanup on SPA navigation).
- Add `<NuxeLayout>` component for case-insensitive layout resolution. Layouts are auto-discovered from the consumer's `layouts/` directory; pages declare their layout via `meta.layout` without touching `app.vue`.

### Patch Changes

- Move generated `typed-router.d.ts` to `.nuxe/` directory to align with the convention for framework-generated files.
- Expand README with file conventions, configuration, CLI reference, head management usage, TypeScript sub-exports, and deployment instructions.
