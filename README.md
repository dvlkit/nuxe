# nuxe

> Meta-framework de Vue para apps con SSR y file-based routing

Una capa de convenciones opinionadas sobre Vue 3, Vite y vue-router: file-based routing, layouts, auto-imports, SSR y per-page head management. Escribes SFCs y configs, el framework se encarga del resto.

## Features

- **File-based routing** - pages en `pages/`, auto-discovery, sin router config manual
- **Layouts por ruta** - meta `layout` en cada page, case-insensitive, sin tocar `app.vue` para agregar uno nuevo
- **Auto-imports** - composables en `composables/` y components en `components/`, cero imports manuales
- **SSR out-of-the-box** - `pnpm dev` para dev, `pnpm build && pnpm start` para prod, sin config extra
- **Per-page `<head>`** - composable `useHead` para title y meta tags, SSR-safe, sin hacks de cleanup
- **TypeScript first** - typed routes, sub-exports del package, sin código custom para configurar

## Quick start

```bash
git clone https://github.com/dvlkit/nuxe
cd nuxe
pnpm install
pnpm dev
```

Abre http://localhost:3000. El playground tiene pages/, layouts/, components/, composables/ para que experimentes.

File conventions

```
my-app/
├── app.vue                # Root component, layout shell
├── pages/                 # File-based routing
│   ├── index.vue          # → /
│   ├── about.vue          # → /about
│   └── admin/
│       └── users.vue      # → /admin/users
├── layouts/               # Layouts reutilizables
│   ├── default.vue
│   └── admin.vue
├── components/            # Auto-imported en templates
├── composables/           # Auto-imported en setup
└── nuxe.config.ts         # Framework config (opcional)
```

Solo esos directorios. app.vue puede tener <RouterLink> y <RouterView> para la navegación.

## Layouts

Cada page puede declarar su layout con definePage:

```vue
<!-- pages/about.vue -->
<script setup lang="ts">
definePage({
  meta: {
    layout: 'admin'  // -> usa layouts/admin.vue
  }
})
</script>

<template>
  <h1>About</h1>
</template>
```

meta.layout es case-insensitive — admin y Admin matchean layouts/admin.vue. Pages sin meta.layout usan layouts/default.vue. Para agregar un layout nuevo: crear layouts/blog.vue, listo — el framework lo descubre.

## Head management

Composable useHead para <title> y <meta> por página:

```vue
<!-- pages/about.vue -->                                                                                                                                                                                                             
<script setup lang="ts">
import { useHead } from '@dvlkit/nuxe'

useHead({
 title: 'About — my-app',
 meta: [
   { name: 'description', content: 'Página about de mi app' }
 ]
})
</script>

<template>
 <h1>About</h1>
</template>
```

Funciona en SSR (los tags se inyectan en el HTML inicial) y client (se actualizan en navegaciones SPA).

## Config

Crea nuxe.config.ts solo si necesitas customizar:

```ts
import { defineConfig } from '@dvlkit/nuxe'

export default defineConfig({
  port: 4000,  // default: 300
  vite: {
    // cualquier opción de UserConfig de vite
  }
})
```

## CLI

| Comando         | Descripción                                       |
|-----------------|---------------------------------------------------|
| nuxe dev        | Dev server con SSR + HMR en http://localhost:3000 |
| nuxe build      | Build de producción (dist/client/ + dist/server/) |
| nuxe start      | Sirve el build de producción                      |
| nuxe --version  | Versión del framework                             |

Variables de entorno: PORT (default 3000), NODE_ENV.
