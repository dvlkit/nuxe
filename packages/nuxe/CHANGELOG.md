# nuxe

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
