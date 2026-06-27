---
"@dvlkit/nuxe": minor
---

# SSR

- renderToWebStream con streaming, chunks de head mid-stream (@unhead/vue/stream)
- Fallback SPA por ruta (vía routeRules)
- Render de error recovery: si falla, recrea la app y renderiza error.vue
- Payload de datos, estado y errores serializado e inyectado como window.__NUXE__

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