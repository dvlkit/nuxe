# vuxe

## 0.2.0

### Minor Changes

- Add `useHead` composable for per-page `<title>` and `<meta>` tags. Works in SSR (tags emitted in initial HTML) and client (auto-cleanup on SPA navigation).
- Add `<VirixLayout>` component for case-insensitive layout resolution. Layouts are auto-discovered from the consumer's `layouts/` directory; pages declare their layout via `meta.layout` without touching `app.vue`.

### Patch Changes

- Move generated `typed-router.d.ts` to `.vuxe/` directory to align with the convention for framework-generated files.
- Expand README with file conventions, configuration, CLI reference, head management usage, TypeScript sub-exports, and deployment instructions.
