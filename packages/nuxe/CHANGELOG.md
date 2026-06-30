# nuxe

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
