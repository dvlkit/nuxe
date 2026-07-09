declare module 'virtual:nuxe/error' {
  import type { Component } from 'vue'
  export const ErrorComponent: Component
}

declare module '/.nuxe/runtime-config.json' {
  const config: import('./config/runtime-config').RuntimeConfig
  export default config
}

declare module '/.nuxe/runtime-config-public.json' {
  const config: import('./config/runtime-config').RuntimeConfig
  export default config
}