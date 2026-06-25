---
"@dvlkit/nuxe": minor
---

Add route middleware system. Create files in `app/middleware/` with `.global.ts` for global middleware (runs on every navigation) or `.ts` for named middleware (referenced via `definePage({ meta: { middleware: 'name' } })` inyour page). Auto-imported helpers: `defineNuxeRouteMiddleware`, `navigateTo`, `abortNavigation`.
