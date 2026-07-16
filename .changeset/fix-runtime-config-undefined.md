---
"@dvlkit/nuxe": patch
---

`NuxeConfigSchema` rechaza `runtimeConfig` con valores `undefined` (típicos de `process.env.X` no definidas en build time), aunque `resolveRuntimeConfig` sí los tolera. Se alinea el schema con el resolver agregando `v.undefined()` al union interno de `runtimeConfigValueSchema`.
